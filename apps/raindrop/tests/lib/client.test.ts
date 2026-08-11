import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  asJson,
  asOptionalJson,
  collectionId,
  compact,
  encodeId,
  formatRaindropError,
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  RaindropClient,
  SYSTEM_COLLECTIONS,
  toIdList,
  toList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, item, items, mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base and prefix are Raindrop's single REST origin", () => {
  assertEquals(API_BASE, "https://api.raindrop.io");
  assertEquals(API_PREFIX, "/rest/v1");
});

/**
 * The OAuth routes are NOT under `/rest`. `https://raindrop.io/oauth/*` answers
 * 307 with `location: https://api.raindrop.io/v1/oauth/*` (measured
 * 2026-08-11), and this app declares the destination so a credential-bearing
 * POST never depends on a redirect being followed correctly.
 */
Deno.test("client: the OAuth URLs are /v1/oauth, not /rest/v1/oauth", () => {
  assertEquals(OAUTH_AUTHORIZE_URL, "https://api.raindrop.io/v1/oauth/authorize");
  assertEquals(OAUTH_TOKEN_URL, "https://api.raindrop.io/v1/oauth/access_token");
  assert(!OAUTH_TOKEN_URL.includes("/rest/"), "the OAuth path picked up the REST prefix");
});

Deno.test("client: the path is built under /rest/v1", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await new RaindropClient(ctx).items("/collections");
  assertEquals(pathOf(calls[0].url), "/rest/v1/collections");
});

Deno.test("client: item() unwraps the single-item envelope", async () => {
  const { ctx } = mockCtx([{ body: item({ _id: 8492393, title: "Development" }) }]);
  assertEquals(await new RaindropClient(ctx).item("/collection/8492393"), {
    _id: 8492393,
    title: "Development",
  });
});

Deno.test("client: items() returns an array even when the endpoint sends none", async () => {
  const { ctx } = mockCtx([{ body: okBody() }]);
  assertEquals(await new RaindropClient(ctx).items("/collections"), []);
});

/**
 * The measured shape that breaks a naive client: a 2xx whose body reports
 * failure. Raindrop's OAuth token endpoint really does answer HTTP 200 with
 * `{"result": false, "status": 400}`.
 */
Deno.test("client: ok() rejects a 200 whose body says result:false", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { result: false, status: 400, errorMessage: "client_id is invalid" } },
  ]);
  const err = await assertRejects(() => new RaindropClient(ctx).ok("/collections"), Error);

  assert(err.message.includes("client_id is invalid"), err.message);
  assert(err.message.includes("body says 400"), err.message);
});

/**
 * And the converse, which is why `json()` exists: `POST /import/url/exists`
 * answers `{"result": false, "ids": []}` for a completely successful "none of
 * these URLs is saved". `json()` must hand that through untouched.
 */
Deno.test("client: json() passes result:false through without throwing", async () => {
  const { ctx } = mockCtx([{ body: { result: false, ids: [] } }]);
  assertEquals(await new RaindropClient(ctx).json("/import/url/exists", { method: "POST" }), {
    result: false,
    ids: [],
  });
});

/**
 * `GET /backup` answers a sentence, not JSON. A parse error there would fail a
 * request the vendor considers successful.
 */
Deno.test("client: json() wraps a non-JSON body instead of throwing", async () => {
  const { ctx } = mockCtx([
    { body: "We will send you email with html export file when it be ready!", headers: {} },
  ]);
  assertEquals(await new RaindropClient(ctx).json("/backup"), {
    result: true,
    message: "We will send you email with html export file when it be ready!",
  });
});

Deno.test("client: a 204 yields an empty object rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new RaindropClient(ctx).json("/collections"), {});
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await new RaindropClient(ctx).items("/raindrops/0", {
    query: { a: "x", b: undefined, c: null, d: "", e: 0, f: false },
  });
  assertEquals(queryOf(calls[0].url), { a: "x", e: "0", f: "false" });
});

Deno.test("client: a JSON body sets the content type the vendor requires", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1 }) }]);
  await new RaindropClient(ctx).item("/raindrop", { method: "POST", body: { link: "https://x" } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"link":"https://x"}');
});

/** No action may set an auth header; the client must not either. */
Deno.test("client: no request carries an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await new RaindropClient(ctx).items("/collections");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: a non-2xx response throws with the vendor's message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { result: false, status: 401, errorMessage: "Unauthorized" } },
  ]);
  const err = await assertRejects(() => new RaindropClient(ctx).items("/collections"), Error);

  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("Unauthorized"), err.message);
  assert(err.message.includes("/rest/v1/collections"), err.message);
});

// --- error formatting -------------------------------------------------------

/**
 * `error` is sometimes a field name (`"view"`), sometimes a code
 * (`"file_invalid"`), sometimes an integer. Keeping it verbatim is what points a
 * caller at the input that has to change.
 */
Deno.test("formatRaindropError: keeps the vendor's error code and message", () => {
  const msg = formatRaindropError(
    400,
    "POST",
    "/rest/v1/collection",
    JSON.stringify(errorBody(
      "Collection validation failed: view: `bla` is not a valid enum value for path `view`.",
      { error: "view" },
    )),
  );
  assert(msg.includes("400 view"), msg);
  assert(msg.includes("is not a valid enum value"), msg);
});

Deno.test("formatRaindropError: reports the body's status when it differs from the HTTP one", () => {
  const msg = formatRaindropError(
    200,
    "POST",
    "/v1/oauth/access_token",
    JSON.stringify({
      result: false,
      status: 400,
      errorMessage: "client_id or client_secret is invalid",
    }),
  );
  assert(msg.includes("Raindrop 200 (body says 400)"), msg);
});

Deno.test("formatRaindropError: a 429 carries the documented rate limit", () => {
  const msg = formatRaindropError(
    429,
    "GET",
    "/rest/v1/user",
    JSON.stringify(errorBody("slow down")),
  );
  assert(/120 requests\/minute/.test(msg), msg);
});

Deno.test("formatRaindropError: a non-JSON body falls back to the raw text", () => {
  const msg = formatRaindropError(502, "GET", "/rest/v1/user", "<html>bad gateway</html>");
  assert(msg.includes("<html>bad gateway</html>"), msg);
});

// --- small helpers ----------------------------------------------------------

Deno.test("SYSTEM_COLLECTIONS: the three ids no collection list ever returns", () => {
  assertEquals(SYSTEM_COLLECTIONS, { all: 0, unsorted: -1, trash: -99 });
});

Deno.test("compact: drops undefined, null and empty string but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

/**
 * `0` and `-99` must survive coercion: they are the ids of "everything" and
 * "Trash", and dropping either would silently retarget a destructive call.
 */
Deno.test("collectionId: keeps zero and the negative system ids", () => {
  assertEquals(collectionId(0), 0);
  assertEquals(collectionId("0"), 0);
  assertEquals(collectionId(-99), -99);
  assertEquals(collectionId(" -1 "), -1);
  assertEquals(collectionId(8492393), 8492393);
  assertThrows(() => collectionId("not-a-number"), Error);
});

Deno.test("encodeId: escapes path separators", () => {
  assertEquals(encodeId(8492393), "8492393");
  assertEquals(encodeId("-99"), "-99");
  assertEquals(encodeId(" 62388e9e48b63606f41e44a6 "), "62388e9e48b63606f41e44a6");
  assertEquals(encodeId("a/b"), "a%2Fb");
  assertEquals(encodeId("a?b=1"), "a%3Fb%3D1");
});

Deno.test("toList: normalises an array, a bare string and a comma-joined string", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a"), ["a"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList([]), undefined);
});

Deno.test("toIdList: turns a comma-joined string of ids into numbers", () => {
  assertEquals(toIdList("3322, 12323"), [3322, 12323]);
  assertEquals(toIdList([1, "2"]), [1, 2]);
  assertEquals(toIdList("abc"), undefined);
  assertEquals(toIdList(""), undefined);
});

Deno.test("asOptionalJson: accepts a parsed value or the string a user typed", () => {
  assertEquals(asOptionalJson([{ link: "x" }], "Items"), [{ link: "x" }]);
  assertEquals(asOptionalJson('[{"link":"x"}]', "Items"), [{ link: "x" }]);
  assertEquals(asOptionalJson(undefined, "Items"), undefined);
  assertEquals(asOptionalJson("", "Items"), undefined);
});

Deno.test("asJson: a missing value is an error, not a silent undefined", () => {
  assertEquals(asJson('{"a":1}', "Items"), { a: 1 });
  let message = "";
  try {
    asJson(undefined, "Items");
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Items is required");
});

Deno.test("truncate: says how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const out = truncate("x".repeat(50), 10);
  assert(out.startsWith("x".repeat(10)));
  assert(out.includes("50 bytes truncated"), out);
});
