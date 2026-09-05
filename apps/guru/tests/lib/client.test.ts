import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  compact,
  extractNextToken,
  formatGuruError,
  GuruClient,
  stripTokens,
  toList,
  truncate,
} from "../../lib/client.ts";
import { API_ROOT, linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base and prefix are Guru's single declared server", () => {
  assertEquals(API_BASE, "https://api.getguru.com");
  assertEquals(API_PREFIX, "/api/v1");
});

Deno.test("client: json() parses a bare object — there is no envelope to unwrap", async () => {
  const { ctx } = mockCtx([{ body: { id: "x" } }]);
  assertEquals(await new GuruClient(ctx).json("/collections/x"), { id: "x" });
});

Deno.test("client: json() parses a bare array unchanged", async () => {
  const { ctx } = mockCtx([{ body: [{ id: "1" }, { id: "2" }] }]);
  assertEquals(await new GuruClient(ctx).json("/collections"), [{ id: "1" }, { id: "2" }]);
});

Deno.test("client: a 204 yields undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new GuruClient(ctx).json("/cards/c1/verify", { method: "PUT" }), undefined);
});

Deno.test("client: status() reports the HTTP status only", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await new GuruClient(ctx).status("/cards/c1", { method: "DELETE" }), 200);
});

Deno.test("client: page() splits items from the Link header's next token", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: "1" }], headers: { link: linkHeader("abc123") } },
  ]);
  const { items, nextToken } = await new GuruClient(ctx).page("/search/cardmgr");

  assertEquals(items, [{ id: "1" }]);
  assertEquals(nextToken, "abc123");
  assertEquals(pathOf(calls[0].url), "/api/v1/search/cardmgr");
});

Deno.test("client: page() has no nextToken when the Link header is absent", async () => {
  const { ctx } = mockCtx([{ body: [{ id: "1" }] }]);
  const { nextToken } = await new GuruClient(ctx).page("/search/cardmgr");
  assertEquals(nextToken, undefined);
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new GuruClient(ctx).json("/collections", {
    query: { a: "x", b: undefined, c: null, d: "", e: 0, f: false },
  });
  assertEquals(queryOf(calls[0].url), { a: "x", e: "0", f: "false" });
});

Deno.test("client: a JSON body sets the content type Guru requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1" } }]);
  await new GuruClient(ctx).json("/collections", { method: "POST", body: { name: "Eng" } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"Eng"}');
});

Deno.test("client: the path is built under /api/v1", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new GuruClient(ctx).json("/collections");
  assertEquals(pathOf(calls[0].url), "/api/v1/collections");
});

Deno.test("client: a non-2xx response throws, even with the empty body Guru actually sends", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined }]);
  const err = await assertRejects(() => new GuruClient(ctx).json("/whoami"), Error);

  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("/api/v1/whoami"), err.message);
});

// --- pagination --------------------------------------------------------------

Deno.test("extractNextToken: reads the token out of a rel=next Link header", () => {
  assertEquals(
    extractNextToken(`<${API_ROOT}/collections?token=xyz>; rel="next"`),
    "xyz",
  );
});

Deno.test("extractNextToken: picks next out of several rel values", () => {
  const header = `<${API_ROOT}/collections?token=prev1>; rel="prev", ` +
    `<${API_ROOT}/collections?token=next1>; rel="next"`;
  assertEquals(extractNextToken(header), "next1");
});

Deno.test("extractNextToken: undefined when there is no header, no next rel, or no token", () => {
  assertEquals(extractNextToken(null), undefined);
  assertEquals(extractNextToken(`<${API_ROOT}/collections>; rel="prev"`), undefined);
  assertEquals(extractNextToken(`<${API_ROOT}/collections>; rel="next"`), undefined);
});

// --- error formatting --------------------------------------------------------

Deno.test("formatGuruError: a 401 explains it as a missing/invalid credential", () => {
  const msg = formatGuruError(401, "GET", "/api/v1/whoami", "");
  assert(msg.includes("401"), msg);
  assert(/missing or invalid/i.test(msg), msg);
});

Deno.test("formatGuruError: a 403 names the Collection-token read-only trap", () => {
  const msg = formatGuruError(403, "POST", "/api/v1/collections", "");
  assert(/read-only/i.test(msg), msg);
});

Deno.test("formatGuruError: a 404 says so plainly", () => {
  const msg = formatGuruError(404, "GET", "/api/v1/cards/x", "");
  assert(/no such resource/i.test(msg), msg);
});

Deno.test("formatGuruError: an empty body produces no dangling colon", () => {
  const msg = formatGuruError(500, "GET", "/api/v1/whoami", "");
  assert(!msg.endsWith(":"), msg);
});

// --- redaction ----------------------------------------------------------------

Deno.test("stripTokens: removes a top-level token", () => {
  assertEquals(
    stripTokens<Record<string, unknown>>({ id: "u1", token: "live-collection-token" }),
    { id: "u1" },
  );
});

Deno.test("stripTokens: removes an embedded collection.token, keeps the rest of it", () => {
  const card = stripTokens<Record<string, unknown>>({
    id: "card1",
    collection: { id: "coll1", name: "Eng", token: "live-collection-token" },
  });
  assertEquals(card, { id: "card1", collection: { id: "coll1", name: "Eng" } });
});

Deno.test("stripTokens: does not mutate its input", () => {
  const input = { token: "x", collection: { token: "y" } };
  stripTokens(input);
  assertEquals(input.token, "x");
  assertEquals(input.collection.token, "y");
});

Deno.test("stripTokens: passes non-objects and array elements' own shape through", () => {
  assertEquals(stripTokens(null), null);
  assertEquals(stripTokens(undefined), undefined);
  assertEquals(stripTokens("text"), "text");
  assertEquals(stripTokens([{ token: "x" }]), [{ token: "x" }]);
});

Deno.test("stripTokens: an entity with no collection is untouched beyond its own token", () => {
  assertEquals(stripTokens<Record<string, unknown>>({ id: "1", name: "Eng" }), {
    id: "1",
    name: "Eng",
  });
});

// --- small helpers -------------------------------------------------------------

Deno.test("compact: drops undefined, null and empty string but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("toList: normalises an array, a bare string and a comma-joined string", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a"), ["a"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList([]), undefined);
});

Deno.test("truncate: says how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const out = truncate("x".repeat(50), 10);
  assert(out.startsWith("x".repeat(10)));
  assert(out.includes("50 bytes truncated"), out);
});
