import { assertEquals } from "@std/assert";
import {
  compact,
  formatJustCallError,
  JustCallClient,
  readRateLimitHeaders,
  toList,
  unwrap,
  unwrapOne,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("toList: splits a comma string and passes an array through", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("unwrap: returns data when the {status, data} envelope is present", () => {
  assertEquals(unwrap({ status: "success", data: { id: 1 } }), { id: 1 });
});

Deno.test("unwrap: returns the body unchanged when there is no envelope", () => {
  assertEquals(unwrap({ id: 1 }), { id: 1 });
  assertEquals(unwrap([1, 2, 3]), [1, 2, 3]);
});

/**
 * `POST`/`PUT /contacts` wrap the created/updated contact in a one-element
 * array; this is the assertion that keeps a caller from seeing `[{...}]`
 * instead of `{...}`.
 */
Deno.test("unwrapOne: takes the first element when data is an array", () => {
  assertEquals(unwrapOne({ status: "success", data: [{ id: 1 }] }), { id: 1 });
});

Deno.test("unwrapOne: passes a bare object through unchanged", () => {
  assertEquals(unwrapOne({ status: "success", data: { id: 1 } }), { id: 1 });
});

Deno.test("formatJustCallError: surfaces the vendor's message verbatim", () => {
  const msg = formatJustCallError(
    401,
    "GET",
    "/v2.1/users",
    JSON.stringify(errorBody("Unauthorized")),
  );
  assertEquals(msg.includes("Unauthorized"), true);
  assertEquals(msg.includes("401"), true);
});

Deno.test("formatJustCallError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatJustCallError(500, "GET", "/v2.1/users", "<html>oops</html>");
  assertEquals(msg.includes("<html>oops</html>"), true);
});

Deno.test("formatJustCallError: names the rate-limit headers on a 429", () => {
  const msg = formatJustCallError(429, "GET", "/v2.1/calls", JSON.stringify(errorBody("Too many")));
  assertEquals(/X-Rate-Limit/.test(msg), true);
});

Deno.test("readRateLimitHeaders: reads both documented windows when present", () => {
  const headers = new Headers({
    "x-rate-limit-limit": "1800",
    "x-rate-limit-remaining": "1799",
    "x-rate-limit-reset": "1893456000",
    "x-rate-limit-burst-limit": "30",
    "x-rate-limit-burst-remaining": "29",
    "x-rate-limit-burst-reset": "1893452400",
  });
  const { hourly, burst } = readRateLimitHeaders(headers);
  assertEquals(hourly, { limit: 1800, remaining: 1799, reset: 1893456000 });
  assertEquals(burst, { limit: 30, remaining: 29, reset: 1893452400 });
});

Deno.test("readRateLimitHeaders: reports neither window when the headers are absent", () => {
  const { hourly, burst } = readRateLimitHeaders(new Headers());
  assertEquals(hourly, undefined);
  assertEquals(burst, undefined);
});

Deno.test("JustCallClient: builds the v2.1-prefixed URL and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { id: 42 } } }]);
  const out = await new JustCallClient(ctx).data("/contacts/42");
  assertEquals(pathOf(calls[0].url), "/v2.1/contacts/42");
  assertEquals(out, { id: 42 });
});

Deno.test("JustCallClient: throws with the vendor's message on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  let threw = false;
  try {
    await new JustCallClient(ctx).data("/users");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("Unauthorized"), true);
  }
  assertEquals(threw, true);
});

Deno.test("JustCallClient: query values are compacted and arrays are comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await new JustCallClient(ctx).json("/calls", {
    query: { call_traits: ["IVR", "MERGE"], page: undefined, per_page: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("call_traits"), "IVR,MERGE");
  assertEquals(url.searchParams.has("page"), false);
  assertEquals(url.searchParams.get("per_page"), "0");
});
