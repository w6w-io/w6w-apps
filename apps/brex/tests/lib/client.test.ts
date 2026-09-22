import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  asJson,
  asOptionalJson,
  BrexClient,
  compact,
  CURRENT_USER_PATH,
  encodeId,
  formatBrexError,
  IDEMPOTENCY_HEADER,
  parseErrorBody,
  queryString,
  toList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, page } from "../_helpers.ts";

Deno.test("client: one production origin, every path behind /v2", () => {
  assertEquals(API_BASE, "https://api.brex.com");
  assertEquals(API_PREFIX, "/v2");
  assertEquals(CURRENT_USER_PATH, "/users/me");
});

/**
 * Brex's multi-value filters are literally named `email[]`, `status[]`, … — the
 * brackets are part of the parameter name, and Brex's own example is
 * `?status[]=ACTIVE,INVITED`. Percent-encoding them would be legal and
 * unrecognizable, so they go on the wire unencoded while values are encoded.
 */
Deno.test("client: queryString keeps Brex's bracketed names and encodes values", () => {
  assertEquals(queryString({ "status[]": ["ACTIVE", "INVITED"] }), "?status[]=ACTIVE%2CINVITED");
  assertEquals(queryString({ "email[]": "a@example.com" }), "?email[]=a%40example.com");
  assertEquals(queryString({ limit: 100, cursor: "abc" }), "?limit=100&cursor=abc");
  assertEquals(queryString({ name: "Ada Lovelace" }), "?name=Ada%20Lovelace");
});

Deno.test("client: queryString drops unset values but keeps false and 0", () => {
  assertEquals(queryString({}), "");
  assertEquals(queryString({ cursor: undefined, name: null, email: "" }), "");
  assertEquals(queryString({ load_custom_fields: false }), "?load_custom_fields=false");
  assertEquals(queryString({ limit: 0 }), "?limit=0");
});

Deno.test("client: compact keeps false and 0, drops undefined/null/empty", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("client: toList splits, trims and drops an empty list", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a"]), ["a"]);
  assertEquals(toList("  "), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(null), undefined);
});

Deno.test("client: json params accept a parsed value or a string", () => {
  assertEquals(asOptionalJson('{"a":1}', "Metadata"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "Metadata"), undefined);
  assertEquals(asOptionalJson("", "Metadata"), undefined);
  assertThrows(() => asOptionalJson("{oops", "Metadata"), Error, "Metadata is not valid JSON");
  assertEquals(asJson('{"a":1}', "Metadata"), { a: 1 });
  assertThrows(() => asJson(undefined, "Metadata"), Error, "Metadata is required");
});

Deno.test("client: encodeId escapes an id without re-shaping it", () => {
  assertEquals(encodeId("cu8oi6a6vbc9"), "cu8oi6a6vbc9");
  assertEquals(encodeId(" a/b?c "), "a%2Fb%3Fc");
});

Deno.test("client: truncate keeps a long body readable", () => {
  assertEquals(truncate("short"), "short");
  assert(truncate("x".repeat(50), 10).startsWith("xxxxxxxxxx…"));
});

Deno.test("client: formatBrexError surfaces type, code and message verbatim", () => {
  const message = formatBrexError(
    404,
    "GET",
    "/v2/users/nope",
    JSON.stringify(errorBody("NOT_FOUND", "Not Found", "USER_NOT_FOUND")),
  );
  assert(message.includes("Brex 404 NOT_FOUND"), message);
  assert(message.includes("code USER_NOT_FOUND"), message);
  assert(message.includes("Not Found"), message);
});

/** Brex documents 1,000 requests/60s and signals it only with a 429. */
Deno.test("client: formatBrexError explains a 429 rather than just reporting it", () => {
  const message = formatBrexError(429, "GET", "/v2/users", "");
  assert(message.includes("Brex 429"), message);
  assert(/exponential backoff/.test(message), message);
  assert(/no error body/.test(message), message);
});

Deno.test("client: formatBrexError survives a non-JSON error body", () => {
  const message = formatBrexError(502, "GET", "/v2/users", "<html>gateway</html>");
  assert(message.includes("Brex 502"), message);
  assert(message.includes("gateway"), message);
});

/**
 * A 401 with no credential carries an EMPTY body (measured 2026-09-22), which is
 * why parsing has to be able to say "nothing was said".
 */
Deno.test("client: parseErrorBody returns undefined for an empty or unparseable body", () => {
  assertEquals(parseErrorBody(""), undefined);
  assertEquals(parseErrorBody("<html>"), undefined);
  assertEquals(parseErrorBody('{"type":"FORBIDDEN","message":"Invalid or Revoked Token"}'), {
    type: "FORBIDDEN",
    message: "Invalid or Revoked Token",
  });
});

Deno.test("client: a GET sends accept, no content-type and no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const out = await new BrexClient(ctx).json<{ id: string }>("/users/u1");

  assertEquals(out, { id: "u1" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.brex.com/v2/users/u1");
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
});

Deno.test("client: a JSON body is serialized and typed, and the idempotency key is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  await new BrexClient(ctx).json("/users", {
    method: "POST",
    body: { first_name: "Ada" },
    idempotencyKey: "step-42",
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers[IDEMPOTENCY_HEADER], "step-42");
  assertEquals(JSON.parse(calls[0].body ?? ""), { first_name: "Ada" });
});

/** Unlock sends no body at all, because Brex documents none. */
Deno.test("client: no body means no content-type header either", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "card_1" } }]);
  await new BrexClient(ctx).json("/cards/card_1/unlock", { method: "POST" });

  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers[IDEMPOTENCY_HEADER], undefined);
});

Deno.test("client: list normalizes items, count and a missing next_cursor", async () => {
  const { ctx } = mockCtx([
    { body: page([{ id: "a" }, { id: "b" }], "cursor_2") },
    { body: { items: [{ id: "c" }] } },
    { body: {} },
  ]);
  const client = new BrexClient(ctx);

  assertEquals(await client.list("/users"), {
    items: [{ id: "a" }, { id: "b" }],
    next_cursor: "cursor_2",
    count: 2,
  });
  assertEquals(await client.list("/users"), {
    items: [{ id: "c" }],
    next_cursor: null,
    count: 1,
  });
  // A workflow that paged on `undefined` would loop forever.
  assertEquals(await client.list("/users"), { items: [], next_cursor: null, count: 0 });
});

Deno.test("client: a non-ok response throws Brex's own error text", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("FORBIDDEN", "Invalid or Revoked Token"),
    },
  ]);
  const err = await assertRejects(
    () => new BrexClient(ctx).json("/users/me"),
    Error,
  );
  assert(err.message.includes("Brex 403 FORBIDDEN"), err.message);
  assert(err.message.includes("Invalid or Revoked Token"), err.message);
});

Deno.test("client: 204 and an empty body both come back as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { body: "" }]);
  const client = new BrexClient(ctx);

  assertEquals(await client.json("/users/x"), undefined);
  assertEquals(await client.json("/users/y"), undefined);
});
