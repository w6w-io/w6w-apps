import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  assertBatchSize,
  BaserowClient,
  compact,
  flag,
  formatBaserowError,
  MAX_BATCH_SIZE,
  mergeFilters,
  normalizeSiteUrl,
  parseRowIds,
  siteUrlFromConnection,
  truncate,
  userFieldNamesFlag,
} from "../../lib/client.ts";
import { errorBody, mockBaserowCtx, page } from "../_helpers.ts";

Deno.test("normalizeSiteUrl: reduces every plausible paste to one origin", () => {
  const expected = "https://baserow.example.com";
  assertEquals(normalizeSiteUrl("https://baserow.example.com"), expected);
  assertEquals(normalizeSiteUrl("https://baserow.example.com/"), expected);
  assertEquals(normalizeSiteUrl("  https://baserow.example.com/api  "), expected);
  assertEquals(normalizeSiteUrl("https://baserow.example.com/database/42/table/1"), expected);
});

/** A token in flight deserves TLS — a bare hostname must not become `http://`. */
Deno.test("normalizeSiteUrl: a missing scheme defaults to https, never http", () => {
  assertEquals(normalizeSiteUrl("baserow.example.com"), "https://baserow.example.com");
  // An explicit http:// is honoured — a private-network operator can still choose it.
  assertEquals(normalizeSiteUrl("http://localhost:8000"), "http://localhost:8000");
});

Deno.test("normalizeSiteUrl: rejects empty and unparseable input", () => {
  assertThrows(() => normalizeSiteUrl(""), Error, "empty");
  assertThrows(() => normalizeSiteUrl("   "), Error, "empty");
  assertThrows(() => normalizeSiteUrl("https://"), Error);
});

Deno.test("siteUrlFromConnection: reads display, and says so when it is missing", () => {
  const { ctx } = mockBaserowCtx();
  assertEquals(siteUrlFromConnection(ctx.connection), "https://baserow.example.com");
  assertThrows(() => siteUrlFromConnection(undefined), Error, "records no instance URL");
});

/**
 * `user_field_names` defaults ON. Off, rows come back keyed `field_4321`, which
 * makes every downstream mapping break the moment a field is recreated.
 */
Deno.test("userFieldNamesFlag: defaults on, and only an explicit false turns it off", () => {
  assertEquals(userFieldNamesFlag(undefined), "true");
  assertEquals(userFieldNamesFlag(true), "true");
  assertEquals(userFieldNamesFlag(false), "false");
});

Deno.test("flag: absent stays absent, so the vendor default applies", () => {
  assertEquals(flag(undefined), undefined);
  assertEquals(flag(true), "true");
  assertEquals(flag(false), "false");
});

Deno.test("compact: drops unset keys but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

Deno.test("asOptionalJson: passes objects through, parses strings, names bad JSON", () => {
  assertEquals(asOptionalJson({ a: 1 }, "X"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "X"), { a: 1 });
  assertEquals(asOptionalJson("", "X"), undefined);
  assertThrows(() => asOptionalJson("{nope", "Field filters"), Error, "Field filters is not valid");
});

Deno.test("parseRowIds: parses a comma-separated list into integers", () => {
  assertEquals(parseRowIds("1,2,3"), [1, 2, 3]);
  assertEquals(parseRowIds(" 12 , 13 "), [12, 13]);
});

Deno.test("parseRowIds: names a non-numeric entry instead of sending it", () => {
  assertThrows(() => parseRowIds("1,abc,3"), Error, '"abc" is not a row id');
  assertThrows(() => parseRowIds("1,-2"), Error, "not a row id");
  assertThrows(() => parseRowIds(""), Error, "empty");
});

/**
 * Baserow caps every batch endpoint at 200 items. Catching it here means a
 * workflow is told before it builds and sends a 5,000-row payload.
 */
Deno.test("assertBatchSize: refuses more than the vendor's 200-item ceiling", () => {
  assertEquals(MAX_BATCH_SIZE, 200);
  assertBatchSize(200, "Rows");
  assertThrows(() => assertBatchSize(201, "Rows"), Error, "exceeds Baserow's batch maximum of 200");
  assertThrows(() => parseRowIds(Array.from({ length: 201 }, (_, i) => i + 1).join(",")), Error);
});

Deno.test("truncate: leaves short text alone and reports what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

/**
 * Baserow's `error` code is the stable half and the `detail` the human half.
 * Both must survive; a validation `detail` is an object, not a string.
 */
Deno.test("formatBaserowError: surfaces the error code and a string detail", () => {
  const msg = formatBaserowError(
    404,
    "GET",
    "/api/database/rows/table/1/9/",
    JSON.stringify(errorBody("ERROR_ROW_DOES_NOT_EXIST", "The row does not exist.")),
  );
  assert(msg.includes("404"), msg);
  assert(msg.includes("ERROR_ROW_DOES_NOT_EXIST"), msg);
  assert(msg.includes("The row does not exist."), msg);
});

Deno.test("formatBaserowError: renders an object detail rather than printing [object Object]", () => {
  const msg = formatBaserowError(
    400,
    "POST",
    "/api/database/rows/table/1/",
    JSON.stringify({ error: "ERROR_REQUEST_BODY_VALIDATION", detail: { Name: ["required"] } }),
  );
  assert(msg.includes("ERROR_REQUEST_BODY_VALIDATION"), msg);
  assert(msg.includes("Name"), msg);
  assert(!msg.includes("[object Object]"), msg);
});

Deno.test("formatBaserowError: falls back to the raw body when it is not Baserow's shape", () => {
  const msg = formatBaserowError(502, "GET", "/api/x/", "<html>bad gateway</html>");
  assert(msg.includes("502"), msg);
  assert(msg.includes("bad gateway"), msg);
});

/**
 * Baserow's row filters are dynamically-named query parameters. Without the
 * `filter__` guard this param would be an arbitrary query-string injection
 * point — a caller could smuggle in `user_field_names` or `size` and silently
 * change the response shape.
 */
Deno.test("mergeFilters: merges filter__ keys and refuses anything else", () => {
  assertEquals(
    mergeFilters({ size: 10 }, { filter__Name__contains: "ada", filter__Age__higher_than: 30 }),
    { size: 10, filter__Name__contains: "ada", filter__Age__higher_than: "30" },
  );
  assertThrows(
    () => mergeFilters({}, { user_field_names: "false" }),
    Error,
    "is not a filter parameter",
  );
  assertThrows(() => mergeFilters({}, { size: 999 }), Error, "is not a filter parameter");
});

Deno.test("mergeFilters: no filters leaves the query untouched", () => {
  assertEquals(mergeFilters({ size: 10 }, undefined), { size: 10 });
});

Deno.test("client: builds against the connection's instance URL", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await new BaserowClient(ctx).request("/api/database/rows/table/1/");
  assertEquals(calls[0].url, "https://baserow.example.com/api/database/rows/table/1/");
});

Deno.test("client: drops empty query values instead of sending blanks", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await new BaserowClient(ctx).request("/api/database/rows/table/1/", {
    query: { a: undefined, b: null, c: "", d: 0, e: false },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("b"), null);
  assertEquals(url.searchParams.get("c"), null);
  assertEquals(url.searchParams.get("d"), "0");
  assertEquals(url.searchParams.get("e"), "false");
});

Deno.test("client: a 204 resolves to undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockBaserowCtx([{ status: 204 }]);
  assertEquals(
    await new BaserowClient(ctx).request("/api/database/rows/table/1/9/", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: a JSON body is sent with a content-type, a GET is not", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: {} }, { body: page([]) }]);
  const client = new BaserowClient(ctx);
  await client.request("/api/database/rows/table/1/", { method: "POST", body: { Name: "Ada" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"Name":"Ada"}');
  await client.request("/api/database/rows/table/1/");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: a non-2xx throws with Baserow's own error code", async () => {
  const { ctx } = mockBaserowCtx([
    { status: 404, body: errorBody("ERROR_ROW_DOES_NOT_EXIST", "The row does not exist.") },
  ]);
  await assertRejects(
    async () => {
      await new BaserowClient(ctx).request("/api/database/rows/table/1/9/");
    },
    Error,
    "ERROR_ROW_DOES_NOT_EXIST",
  );
});

/** The action worker must never see or build an Authorization header. */
Deno.test("client: never sets an authorization header — that is sign's job", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await new BaserowClient(ctx).request("/api/database/rows/table/1/");
  assertEquals(calls[0].headers["authorization"], undefined);
});
