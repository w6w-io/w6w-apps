import { assert, assertEquals } from "@std/assert";
import { compact, formatOpusError, OpusClipClient } from "../../lib/client.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("formatOpusError: recognises the monthly-cap shape", () => {
  const msg = formatOpusError(
    403,
    "POST",
    "/api/clip-projects",
    JSON.stringify({ code: "API_MONTHLY_CAP_REACHED", reset_at: "2026-10-01T00:00:00Z" }),
  );
  assert(msg.includes("API_MONTHLY_CAP_REACHED"));
  assert(msg.includes("2026-10-01T00:00:00Z"));
});

Deno.test("formatOpusError: recognises the errorName/errorMessage shape", () => {
  const msg = formatOpusError(
    402,
    "POST",
    "/api/collections",
    JSON.stringify({ errorName: "QuotaExceed", errorMessage: "plan limit reached" }),
  );
  assert(msg.includes("QuotaExceed"));
  assert(msg.includes("plan limit reached"));
});

Deno.test("formatOpusError: falls back to the raw body for a non-JSON response (the plain-text 401)", () => {
  const msg = formatOpusError(401, "GET", "/api/social-accounts", "Unauthorized");
  assert(msg.includes("401"));
  assert(msg.includes("Unauthorized"));
});

Deno.test("OpusClipClient.data: unwraps the {data: ...} envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope({ collectionId: "c1" }) }]);
  const out = await new OpusClipClient(ctx).data<{ collectionId: string }>("/api/collections");
  assertEquals(out.collectionId, "c1");
});

Deno.test("OpusClipClient.json: does not unwrap — the bare-resource shape", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "P1" } }]);
  const out = await new OpusClipClient(ctx).json<{ id: string }>("/api/clip-projects/P1");
  assertEquals(out.id, "P1");
});

Deno.test("OpusClipClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: "Unauthorized", headers: { "content-type": "text/plain" } },
  ]);
  try {
    await new OpusClipClient(ctx).json("/api/social-accounts");
    throw new Error("expected rejection");
  } catch (e) {
    assert(e instanceof Error);
    assert(e.message.includes("401"));
    assert(e.message.includes("Unauthorized"));
  }
});

Deno.test("OpusClipClient: sends a JSON body and content-type when a body is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "P1" } }]);
  await new OpusClipClient(ctx).json("/api/clip-projects", {
    method: "POST",
    body: { videoUrl: "https://x" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { videoUrl: "https://x" });
});

Deno.test("OpusClipClient: builds the URL against api.opus.pro with query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await new OpusClipClient(ctx).json("/api/brand-templates", { query: { q: "mine" } });
  assertEquals(pathOf(calls[0].url), "/api/brand-templates");
  assert(calls[0].url.startsWith("https://api.opus.pro"));
});
