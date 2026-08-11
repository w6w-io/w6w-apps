import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  compact,
  DatadogClient,
  datadogErrorMessages,
  encodeSegment,
  formatDatadogError,
  toList,
  truncate,
} from "../../lib/client.ts";
import { siteById } from "../../lib/sites.ts";
import { EU1, mockCtx, queryOf, US1 } from "../_helpers.ts";

const us1 = siteById("us1")!;
const eu1 = siteById("eu1")!;

Deno.test("client: the origin comes from the connection's site", async () => {
  const { ctx, calls } = mockCtx([{ body: { valid: true } }], "eu1");
  await new DatadogClient(ctx).json("/api/v1/validate");
  assertEquals(calls[0].url, `${EU1}/api/v1/validate`);
});

Deno.test("client: it never sets an auth header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new DatadogClient(ctx).json("/api/v1/validate");
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept"]);
});

Deno.test("client: query values are set, blanks dropped, arrays comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new DatadogClient(ctx).json("/api/v1/hosts", {
    query: { filter: "env:prod", count: 5, empty: "", missing: undefined, tags: ["a", "b"] },
  });
  assertEquals(queryOf(calls[0].url), { filter: "env:prod", count: "5", tags: "a,b" });
});

/**
 * Datadog's own instruction for its bracketed v2 filters is to URL-encode the
 * brackets, which is exactly what `URLSearchParams` does. Asserting the encoded
 * form keeps a well-meaning "fix" from unescaping them.
 */
Deno.test("client: bracketed v2 params are URL-encoded, as the vendor documents", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new DatadogClient(ctx).json("/api/v2/events", {
    query: { "filter[query]": "status:error", "page[limit]": 10 },
  });
  assert(calls[0].url.includes("filter%5Bquery%5D=status%3Aerror"), calls[0].url);
  assert(calls[0].url.includes("page%5Blimit%5D=10"), calls[0].url);
  assertEquals(queryOf(calls[0].url), { "filter[query]": "status:error", "page[limit]": "10" });
});

Deno.test("client: a JSON body sets content-type and is serialized", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await new DatadogClient(ctx).status("/api/v2/series", {
    method: "POST",
    body: { series: [] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"series":[]}');
});

Deno.test("client: a 204 yields no body and does not throw", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new DatadogClient(ctx).json("/api/v2/downtime/x", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: a failure raises with Datadog's own message and the site named", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }], "eu1");
  const err = await assertRejects(
    () => new DatadogClient(ctx).json("/api/v1/monitor"),
    Error,
  );
  assert(err.message.includes("Forbidden"), err.message);
  assert(err.message.includes("EU1"), err.message);
});

// --- the two error shapes ----------------------------------------------------

Deno.test("errors: the v1 string-array shape is read", () => {
  assertEquals(datadogErrorMessages('{"errors":["Forbidden"]}'), ["Forbidden"]);
  assertEquals(datadogErrorMessages('{"errors":["Not found","and again"]}'), [
    "Not found",
    "and again",
  ]);
});

/**
 * The half of v2 that would otherwise print `[object Object]`. `title` is the
 * category and `detail` the cause; both are kept, and the JSON:API `source`
 * pointer names the offending field.
 */
Deno.test("errors: the v2 JSON:API object shape is read", () => {
  const raw = JSON.stringify({
    errors: [{
      status: "400",
      title: "Bad Request",
      detail: "scope is required",
      source: { pointer: "/data/attributes/scope" },
    }],
  });
  assertEquals(datadogErrorMessages(raw), [
    "Bad Request: scope is required (at /data/attributes/scope)",
  ]);
});

Deno.test("errors: an unparseable or unshaped body yields nothing rather than nonsense", () => {
  assertEquals(datadogErrorMessages("<html>502 Bad Gateway</html>"), []);
  assertEquals(datadogErrorMessages('{"message":"nope"}'), []);
  assertEquals(datadogErrorMessages('{"errors":{}}'), []);
});

Deno.test("errors: a body with no messages falls back to the raw text", () => {
  const msg = formatDatadogError(502, "GET", "/api/v1/monitor", "<html>gateway</html>", us1);
  assert(msg.includes("<html>gateway</html>"), msg);
});

/**
 * A 401 and a 403 mean different things at Datadog and have different fixes.
 * The 403 hint names the wrong-site case explicitly because it is the single
 * most common Datadog integration failure and is invisible on the wire.
 */
Deno.test("errors: 401 and 403 carry different, specific guidance", () => {
  const unauthorized = formatDatadogError(
    401,
    "GET",
    "/api/v1/monitor",
    '{"errors":["Unauthorized"]}',
    us1,
  );
  assert(unauthorized.includes("no credential reached"), unauthorized);

  const forbidden = formatDatadogError(
    403,
    "GET",
    "/api/v1/monitor",
    '{"errors":["Forbidden"]}',
    eu1,
  );
  assert(forbidden.includes("different Datadog site"), forbidden);
  assert(forbidden.includes("EU1 (datadoghq.eu)"), forbidden);
  assert(!forbidden.includes("no credential reached"), forbidden);
});

Deno.test("errors: a 429 points at the reset header", () => {
  const msg = formatDatadogError(429, "GET", "/api/v1/monitor", '{"errors":["Too many"]}', us1);
  assert(msg.includes("X-RateLimit-Reset"), msg);
});

// --- small helpers -----------------------------------------------------------

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

Deno.test("toList: splits, trims and drops blanks", () => {
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", " b "]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(" , "), undefined);
});

Deno.test("encodeSegment: neutralises path separators in a pasted id", () => {
  assertEquals(encodeSegment("abc-def-ghi"), "abc-def-ghi");
  assertEquals(encodeSegment(12345), "12345");
  assertEquals(encodeSegment("system.cpu.user"), "system.cpu.user");
  assertEquals(encodeSegment("a/b?c=d"), "a%2Fb%3Fc%3Dd");
});

Deno.test("asJson: accepts a string or an already-parsed value, and rejects garbage", () => {
  assertEquals(asOptionalJson('{"a":1}', "X"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "X"), { a: 1 });
  assertEquals(asOptionalJson("", "X"), undefined);
  assertThrows(() => asJson("{oops", "Points"), Error, "Points is not valid JSON");
  assertThrows(() => asJson(undefined, "Points"), Error, "Points is required");
});

Deno.test("truncate: keeps short text and marks what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  const long = truncate("x".repeat(50), 10);
  assert(long.startsWith("xxxxxxxxxx…"), long);
  assert(long.includes("50 bytes truncated"), long);
});

Deno.test("client: US1 remains the origin for a us1 connection", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new DatadogClient(ctx).json("/api/v1/validate");
  assertEquals(calls[0].url, `${US1}/api/v1/validate`);
});
