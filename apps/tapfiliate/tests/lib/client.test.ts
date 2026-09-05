import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  boolStr,
  compact,
  encodeId,
  flagStr,
  formatTapfiliateError,
  nextPageOf,
  parseLinkHeader,
  TapfiliateClient,
  truncate,
} from "../../lib/client.ts";
import { errorBody, linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("boolStr: renders the literal word, undefined stays undefined", () => {
  assertEquals(boolStr(true), "true");
  assertEquals(boolStr(false), "false");
  assertEquals(boolStr(undefined), undefined);
});

Deno.test("flagStr: renders 1/0 — the encoding GET /commissions/ documents for `paid`", () => {
  assertEquals(flagStr(true), "1");
  assertEquals(flagStr(false), "0");
  assertEquals(flagStr(undefined), undefined);
});

Deno.test("encodeId: escapes path-breaking characters", () => {
  assertEquals(encodeId("cu_eXampl3"), "cu_eXampl3");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
  assertEquals(encodeId(42), "42");
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(500);
  const out = truncate(long, 300);
  assert(out.startsWith("x".repeat(300)));
  assert(out.includes("500 bytes truncated"));
});

Deno.test("formatTapfiliateError: parses the vendor's JSON {message, code} shape", () => {
  const msg = formatTapfiliateError(
    401,
    "GET",
    "/1.6/programs/",
    "application/json",
    JSON.stringify({ message: "Authentication Failed.", code: 401 }),
  );
  assertEquals(msg, "Tapfiliate 401 for GET /1.6/programs/: Authentication Failed.");
});

Deno.test("formatTapfiliateError: appends a rate-limit note on 429", () => {
  const msg = formatTapfiliateError(
    429,
    "GET",
    "/1.6/programs/",
    "application/json",
    JSON.stringify({ message: "Too many requests.", code: 429 }),
  );
  assert(msg.includes("rate-limited"));
});

Deno.test("formatTapfiliateError: an HTML body is reported as non-JSON, not parsed as JSON", () => {
  const msg = formatTapfiliateError(
    401,
    "GET",
    "/1.6/programs/",
    "text/html; charset=UTF-8",
    "<!DOCTYPE html><html><head><title>Unauthorized</title></head></html>",
  );
  assert(msg.includes("non-JSON response"));
  assert(msg.includes("missing/empty credential or an unmapped path"));
  assert(!msg.includes("undefined"));
});

Deno.test("formatTapfiliateError: JSON content-type but unparsable body still falls back cleanly", () => {
  const msg = formatTapfiliateError(500, "GET", "/1.6/programs/", "application/json", "not json");
  assert(msg.includes("non-JSON response"));
});

Deno.test("parseLinkHeader: reads rel=next/last/first/prev", () => {
  const header = '<https://api.tapfiliate.com/1.6/conversions/?page=3>; rel="next", ' +
    '<https://api.tapfiliate.com/1.6/conversions/?page=51>; rel="last"';
  const links = parseLinkHeader(header);
  assertEquals(links.next, "https://api.tapfiliate.com/1.6/conversions/?page=3");
  assertEquals(links.last, "https://api.tapfiliate.com/1.6/conversions/?page=51");
});

Deno.test("parseLinkHeader: null header returns an empty map", () => {
  assertEquals(parseLinkHeader(null), {});
});

Deno.test("nextPageOf: extracts the page number from rel=next", () => {
  assertEquals(
    nextPageOf('<https://api.tapfiliate.com/1.6/customers/?page=4>; rel="next"'),
    4,
  );
});

Deno.test("nextPageOf: no next rel, or a header carrying no page, returns undefined", () => {
  assertEquals(nextPageOf(null), undefined);
  assertEquals(nextPageOf('<https://api.tapfiliate.com/1.6/customers/>; rel="last"'), undefined);
});

Deno.test("TapfiliateClient.json: builds the versioned URL and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "johns-affiliate-program", currency: "USD" } }]);
  const out = await new TapfiliateClient(ctx).json("/programs/johns-affiliate-program/");
  assertEquals(pathOf(calls[0].url), "/1.6/programs/johns-affiliate-program/");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "johns-affiliate-program", currency: "USD" });
});

Deno.test("TapfiliateClient.json: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new TapfiliateClient(ctx).json("/customers/cu_x/", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("TapfiliateClient.json: sends a JSON content-type only when a body is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new TapfiliateClient(ctx).json("/affiliate-groups/", {
    method: "POST",
    body: { title: "Gold" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ title: "Gold" }));
});

Deno.test("TapfiliateClient.list: returns a bare array plus the next page from the Link header", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 1 }, { id: 2 }], headers: { link: linkHeader(2) } },
  ]);
  const page = await new TapfiliateClient(ctx).list("/customers/", { query: { page: 1 } });
  assertEquals(page.items, [{ id: 1 }, { id: 2 }]);
  assertEquals(page.nextPage, 2);
  assertEquals(queryOf(calls[0].url).page, "1");
});

Deno.test("TapfiliateClient.list: no Link header means no next page", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const page = await new TapfiliateClient(ctx).list("/balances/");
  assertEquals(page.items, []);
  assertEquals(page.nextPage, undefined);
});

Deno.test("TapfiliateClient: an error response with a JSON body throws a formatted message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Authentication Failed.", 401) }]);
  await assertRejects(
    () => new TapfiliateClient(ctx).json("/programs/"),
    Error,
    "Authentication Failed.",
  );
});

Deno.test("TapfiliateClient: an error response with an HTML body throws a non-JSON message, not a parse crash", async () => {
  const { ctx } = mockCtx([
    { status: 401, headers: { "content-type": "text/html" }, body: "<html>Unauthorized</html>" },
  ]);
  await assertRejects(
    () => new TapfiliateClient(ctx).json("/programs/"),
    Error,
    "non-JSON response",
  );
});

Deno.test("TapfiliateClient.status: returns the raw status code", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const status = await new TapfiliateClient(ctx).status("/commissions/1/approved/", {
    method: "PUT",
  });
  assertEquals(status, 200);
});
