import { assertEquals } from "@std/assert";
import { compact, formatPdfCoError, PdfCoClient, truncate } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long);
  assertEquals(out.startsWith("x".repeat(600)), true);
  assertEquals(out.includes("700 bytes truncated"), true);
});

Deno.test("formatPdfCoError: prefers message + errorCode (the shape seen live on auth failures)", () => {
  const raw = JSON.stringify({ status: "error", errorCode: 401, error: true, message: "no key" });
  const msg = formatPdfCoError(401, "GET", "/v1/account/credit/balance", raw);
  assertEquals(msg.includes("401"), true);
  assertEquals(msg.includes("no key"), true);
});

Deno.test("formatPdfCoError: falls back to status when errorCode is absent (documented shape)", () => {
  const raw = JSON.stringify({ error: true, status: 402, message: "Not enough credits." });
  const msg = formatPdfCoError(402, "POST", "/v1/pdf/merge", raw);
  assertEquals(msg.includes("402"), true);
  assertEquals(msg.includes("Not enough credits."), true);
});

Deno.test("formatPdfCoError: adds a retry hint on 429", () => {
  const raw = JSON.stringify({ error: true, message: "Too many requests." });
  const msg = formatPdfCoError(429, "GET", "/v1/account/credit/balance", raw);
  assertEquals(msg.includes("retry with backoff"), true);
});

Deno.test("formatPdfCoError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatPdfCoError(500, "POST", "/v1/pdf/info", "<html>Internal Server Error</html>");
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("Internal Server Error"), true);
});

Deno.test("PdfCoClient.post: sends JSON, parses the JSON response", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new PdfCoClient(ctx);
  const out = await client.post("/v1/pdf/info", { url: "https://x/a.pdf" });

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/pdf/info");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://x/a.pdf" });
  assertEquals(out, { ok: true });
});

Deno.test("PdfCoClient.get: builds a query string and sends no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { remainingCredits: 1 } }]);
  const client = new PdfCoClient(ctx);
  await client.get("/v1/file/upload/get-presigned-url", {
    name: "a.pdf",
    contenttype: "application/pdf",
  });

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("name"), "a.pdf");
  assertEquals(url.searchParams.get("contenttype"), "application/pdf");
});

Deno.test("PdfCoClient: a non-2xx status (including PDF.co's custom 4xx codes) throws", async () => {
  const { ctx } = mockCtx([
    { status: 441, body: { error: true, status: 441, message: "Invalid Password." } },
  ]);
  const client = new PdfCoClient(ctx);
  await client.post("/v1/pdf/info", { url: "https://x/a.pdf" }).then(
    () => {
      throw new Error("expected post() to reject on HTTP 441");
    },
    (err: Error) => {
      assertEquals(err.message.includes("Invalid Password."), true, err.message);
    },
  );
});
