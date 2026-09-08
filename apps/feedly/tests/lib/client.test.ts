import { assert, assertEquals, assertRejects } from "@std/assert";
import { compactQuery, FeedlyClient, formatFeedlyError, webhookPath } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compactQuery: drops undefined, null and empty-string values", () => {
  assertEquals(
    compactQuery({ a: "x", b: undefined, c: null as unknown as undefined, d: "", e: 0, f: false }),
    { a: "x", e: "0", f: "false" },
  );
});

Deno.test("formatFeedlyError: keeps the vendor's errorMessage verbatim", () => {
  const raw = JSON.stringify(errorBody(401, "must provide authorization token"));
  const msg = formatFeedlyError(401, "GET", "/v3/profile", raw);
  assert(msg.includes("must provide authorization token"), msg);
  assert(msg.includes("401"), msg);
});

Deno.test("formatFeedlyError: a 429 names the monthly cap", () => {
  const raw = JSON.stringify(errorBody(429, "rate limit exceeded"));
  const msg = formatFeedlyError(429, "GET", "/v3/streams/contents", raw);
  assert(/100,000/.test(msg), msg);
});

Deno.test("formatFeedlyError: a non-JSON body is truncated, not thrown on", () => {
  const msg = formatFeedlyError(500, "GET", "/v3/profile", "<html>server error</html>");
  assert(msg.includes("<html>server error</html>"), msg);
});

Deno.test("webhookPath: no stray colon — see the module doc for why", () => {
  assertEquals(
    webhookPath("166e676a496:52:8c61af75"),
    "/v3/enterprise/triggers/166e676a496%3A52%3A8c61af75",
  );
  assert(!webhookPath("abc").includes(":{"));
});

Deno.test("FeedlyClient.json: unwraps nothing — Feedly has no envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x", items: [] } }]);
  const out = await new FeedlyClient(ctx).json("/v3/streams/contents", {
    query: { streamId: "feed/x" },
  });
  assertEquals(out, { id: "x", items: [] });
  assertEquals(pathOf(calls[0].url), "/v3/streams/contents");
  assertEquals(new URL(calls[0].url).searchParams.get("streamId"), "feed/x");
});

Deno.test("FeedlyClient.json: a 204 or empty body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new FeedlyClient(ctx).json("/v3/annotations", { method: "POST" });
  assertEquals(out, undefined);
});

Deno.test("FeedlyClient: a non-ok response throws with the vendor's errorMessage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(401, "invalid token") }]);
  await assertRejects(
    () => new FeedlyClient(ctx).json("/v3/profile"),
    Error,
    "invalid token",
  );
});

Deno.test("FeedlyClient.status: returns the status code without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const status = await new FeedlyClient(ctx).status("/v3/tags/x/y", { method: "DELETE" });
  assertEquals(status, 200);
});

Deno.test("FeedlyClient: a JSON body is sent with a content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new FeedlyClient(ctx).json("/v3/annotations", {
    method: "POST",
    body: { entryId: "e1", comment: "hi" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { entryId: "e1", comment: "hi" });
});
