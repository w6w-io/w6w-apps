import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  ApifyClient,
  asJson,
  asOptionalJson,
  compact,
  encodeId,
  flag,
  formatApifyError,
  isJsonContentType,
  isTextualContentType,
  REDACTED_FIELDS,
  stripSecrets,
  toList,
  truncate,
} from "../../lib/client.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base and prefix are Apify's single declared server", () => {
  assertEquals(API_BASE, "https://api.apify.com");
  assertEquals(API_PREFIX, "/v2");
});

Deno.test("client: data() unwraps the envelope", async () => {
  const { ctx } = mockCtx([{ body: envelope({ id: "x" }) }]);
  assertEquals(await new ApifyClient(ctx).data("/actors/x"), { id: "x" });
});

/**
 * A body with no `data` key is returned whole. That matters for the endpoints
 * that answer `{}` on success — collapsing them to `undefined` would look like
 * a failure.
 */
Deno.test("client: data() passes an un-enveloped body through", async () => {
  const { ctx } = mockCtx([{ body: { id: "x" } }]);
  assertEquals(await new ApifyClient(ctx).data("/x"), { id: "x" });
});

Deno.test("client: json() does not unwrap, so a bare array stays an array", async () => {
  const { ctx } = mockCtx([{ body: [{ a: 1 }] }]);
  assertEquals(await new ApifyClient(ctx).json("/datasets/d1/items"), [{ a: 1 }]);
});

Deno.test("client: a 204 yields undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new ApifyClient(ctx).json("/webhooks/w1"), undefined);
});

Deno.test("client: raw() returns the body and its content type verbatim", async () => {
  const { ctx } = mockCtx([{ body: "plain log", headers: { "content-type": "text/plain" } }]);
  const res = await new ApifyClient(ctx).raw("/actor-runs/r1/log", { accept: "text/plain" });

  assertEquals(res.status, 200);
  assertEquals(res.contentType, "text/plain");
  assertEquals(res.text, "plain log");
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new ApifyClient(ctx).data("/actors", {
    query: { a: "x", b: undefined, c: null, d: "", e: 0, f: false },
  });
  assertEquals(queryOf(calls[0].url), { a: "x", e: "0", f: "false" });
});

/**
 * Apify takes multi-valued query parameters as ONE comma-separated value, not
 * as a repeated key.
 */
Deno.test("client: array query values are comma-joined into a single key", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new ApifyClient(ctx).data("/actor-runs", { query: { status: ["FAILED", "TIMED-OUT"] } });

  assertEquals(new URL(calls[0].url).searchParams.getAll("status"), ["FAILED,TIMED-OUT"]);
});

Deno.test("client: a JSON body sets the content type the vendor requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await new ApifyClient(ctx).data("/datasets/d1/items", { method: "POST", body: [{ a: 1 }] });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '[{"a":1}]');
});

Deno.test("client: a raw body keeps its own content type and text", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await new ApifyClient(ctx).status("/key-value-stores/s1/records/k", {
    method: "PUT",
    rawBody: { contentType: "text/csv", text: "a,b\n1,2" },
  });

  assertEquals(calls[0].headers["content-type"], "text/csv");
  assertEquals(calls[0].body, "a,b\n1,2");
});

Deno.test("client: the path is built under /v2", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new ApifyClient(ctx).data("/actors");
  assertEquals(pathOf(calls[0].url), "/v2/actors");
});

Deno.test("client: a non-2xx response throws with the vendor's error type", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("token-not-provided", "Authentication token was not provided") },
  ]);
  const err = await assertRejects(() => new ApifyClient(ctx).data("/actors"), Error);

  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("token-not-provided"), err.message);
  assert(err.message.includes("/v2/actors"), err.message);
});

// --- error formatting -------------------------------------------------------

Deno.test("formatApifyError: keeps the machine code and the vendor's message", () => {
  const msg = formatApifyError(
    404,
    "GET",
    "/v2/datasets/d1",
    JSON.stringify(errorBody("record-not-found", "Store was not found.")),
  );
  assertEquals(
    msg,
    "Apify 404 record-not-found for GET /v2/datasets/d1: Store was not found.",
  );
});

Deno.test("formatApifyError: a 429 carries the backoff advice the vendor documents", () => {
  const msg = formatApifyError(
    429,
    "GET",
    "/v2/actors",
    JSON.stringify(errorBody("rate-limit-exceeded", "You have exceeded the rate limit")),
  );
  assert(/exponential backoff/.test(msg), msg);
});

Deno.test("formatApifyError: a non-JSON body falls back to the raw text", () => {
  const msg = formatApifyError(502, "GET", "/v2/actors", "<html>bad gateway</html>");
  assert(msg.includes("<html>bad gateway</html>"), msg);
});

// --- redaction --------------------------------------------------------------

Deno.test("stripSecrets: removes exactly the two documented credential fields", () => {
  assertEquals(REDACTED_FIELDS, ["proxy.password", "urlSigningSecretKey"]);

  const dataset = stripSecrets<Record<string, unknown>>({
    id: "d1",
    urlSigningSecretKey: "hmac",
    itemCount: 3,
  });
  assertEquals(dataset, { id: "d1", itemCount: 3 });

  const user = stripSecrets<Record<string, unknown>>({
    username: "acme",
    proxy: { password: "p", groups: [{ name: "RESIDENTIAL" }] },
  });
  assertEquals(user, { username: "acme", proxy: { groups: [{ name: "RESIDENTIAL" }] } });
});

/**
 * The strip must stay narrow. This app's payload is scraped data, so a
 * heuristic that ate any field named `token` or `password` would corrupt the
 * very thing the user is collecting.
 */
Deno.test("stripSecrets: leaves a user's own similarly-named fields alone", () => {
  const item = { password: "scraped from a form", token: "abc", nested: { password: "x" } };
  assertEquals(stripSecrets(item), item);
});

Deno.test("stripSecrets: does not mutate its input", () => {
  const input = { id: "d1", urlSigningSecretKey: "hmac", proxy: { password: "p" } };
  stripSecrets(input);
  assertEquals(input.urlSigningSecretKey, "hmac");
  assertEquals(input.proxy.password, "p");
});

Deno.test("stripSecrets: passes non-objects through untouched", () => {
  assertEquals(stripSecrets(null), null);
  assertEquals(stripSecrets(undefined), undefined);
  assertEquals(stripSecrets("text"), "text");
  assertEquals(stripSecrets([{ urlSigningSecretKey: "x" }]), [{ urlSigningSecretKey: "x" }]);
});

// --- small helpers ----------------------------------------------------------

Deno.test("flag: true becomes 1, everything else is absent", () => {
  assertEquals(flag(true), "1");
  assertEquals(flag(false), undefined);
  assertEquals(flag(undefined), undefined);
});

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

Deno.test("asOptionalJson: accepts a parsed value or the string a user typed", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
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

/**
 * `encodeId` must leave `~` alone — it is the separator in Apify's
 * `username~resource-name` addressing form — while still neutralising a `/` or
 * `?` pasted into an id field.
 */
Deno.test("encodeId: keeps the tilde and escapes path separators", () => {
  assertEquals(encodeId("apify~web-scraper"), "apify~web-scraper");
  assertEquals(encodeId("~my-store"), "~my-store");
  assertEquals(encodeId(" a1 "), "a1");
  assertEquals(encodeId("a/b"), "a%2Fb");
  assertEquals(encodeId("a?b=1"), "a%3Fb%3D1");
  assertEquals(encodeId("a b"), "a%20b");
});

Deno.test("truncate: says how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const out = truncate("x".repeat(50), 10);
  assert(out.startsWith("x".repeat(10)));
  assert(out.includes("50 bytes truncated"), out);
});

Deno.test("isTextualContentType: recognises text, JSON and the RFC 6839 suffixes", () => {
  assertEquals(isTextualContentType("text/plain; charset=utf-8"), true);
  assertEquals(isTextualContentType("application/json"), true);
  assertEquals(isTextualContentType("application/vnd.api+json"), true);
  assertEquals(isTextualContentType("application/atom+xml"), true);
  assertEquals(isTextualContentType("image/png"), false);
  assertEquals(isTextualContentType("application/zip"), false);
  assertEquals(isTextualContentType("application/octet-stream"), false);
  assertEquals(isTextualContentType(""), false);
});

Deno.test("isJsonContentType: only JSON and its structured suffix", () => {
  assertEquals(isJsonContentType("application/json; charset=utf-8"), true);
  assertEquals(isJsonContentType("application/vnd.api+json"), true);
  assertEquals(isJsonContentType("text/plain"), false);
  assertEquals(isJsonContentType("application/jsonl"), false);
});
