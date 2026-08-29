import { assert, assertEquals, assertRejects } from "@std/assert";
import { compact, formatReadwiseError, ReadwiseClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("ReadwiseClient: builds the full URL under readwise.io/api/v2", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new ReadwiseClient(ctx).json("/auth/");
  assertEquals(calls[0].url, "https://readwise.io/api/v2/auth/");
});

Deno.test("ReadwiseClient: query params are set, and empty ones dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await new ReadwiseClient(ctx).json("/highlights/", {
    query: { page_size: 10, book_id: undefined, updated__gt: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page_size"), "10");
  assertEquals(url.searchParams.has("book_id"), false);
  assertEquals(url.searchParams.has("updated__gt"), false);
});

Deno.test("ReadwiseClient: a JSON body is sent with content-type application/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await new ReadwiseClient(ctx).json("/highlights/", {
    method: "POST",
    body: { highlights: [{ text: "hi" }] },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { highlights: [{ text: "hi" }] });
});

Deno.test("ReadwiseClient.json: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new ReadwiseClient(ctx).json("/highlights/1/");
  assertEquals(out, undefined);
});

Deno.test("ReadwiseClient.status: returns the HTTP status without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new ReadwiseClient(ctx).status("/highlights/1/", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("ReadwiseClient: a non-ok response throws with the vendor's detail message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { detail: "Invalid token." } },
  ]);
  await assertRejects(
    () => new ReadwiseClient(ctx).json("/highlights/"),
    Error,
    "Invalid token.",
  );
});

Deno.test("formatReadwiseError: renders the detail field for an auth failure", () => {
  const msg = formatReadwiseError(
    401,
    "GET",
    "/api/v2/auth/",
    JSON.stringify({ detail: "Authentication credentials were not provided." }),
  );
  assert(msg.includes("Authentication credentials were not provided."));
  assert(msg.includes("401"));
});

Deno.test("formatReadwiseError: flattens a DRF field-error body to field: message pairs", () => {
  const msg = formatReadwiseError(
    400,
    "POST",
    "/api/v2/highlights/",
    JSON.stringify({ text: ["This field is required."] }),
  );
  assert(msg.includes("text: This field is required."));
});

Deno.test("formatReadwiseError: a 429 names the Retry-After header when present", () => {
  const msg = formatReadwiseError(429, "GET", "/api/v2/highlights/", "", "30");
  assert(msg.includes("retry after 30s"));
});

Deno.test("formatReadwiseError: a 429 without Retry-After still names the rate limit", () => {
  const msg = formatReadwiseError(429, "GET", "/api/v2/highlights/", "", null);
  assert(msg.includes("rate-limited"));
});

Deno.test("formatReadwiseError: non-JSON bodies fall back to the raw text", () => {
  const msg = formatReadwiseError(500, "GET", "/api/v2/highlights/", "<html>oops</html>");
  assert(msg.includes("<html>oops</html>"));
});
