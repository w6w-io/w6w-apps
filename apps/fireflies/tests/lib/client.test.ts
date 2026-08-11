import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import { AUTH_FAILED_500, mockCtx, sent } from "../_helpers.ts";
import {
  API_URL,
  compact,
  csv,
  errorCode,
  FirefliesClient,
  formatErrors,
  intArg,
} from "../../lib/client.ts";

Deno.test("client: posts to the single GraphQL endpoint with no Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { ok: true } } }]);
  await new FirefliesClient(ctx).query("{ ok }");
  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  // Credentials belong to `sign`, never to a caller of the client.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(sent(calls[0]).query, "{ ok }");
});

Deno.test("client: an HTTP 500 auth_failed is reported as a credential error, not an outage", async () => {
  // This is THE Fireflies quirk: a rejected key answers 500 with a valid
  // GraphQL envelope. Reading `res.ok` first would report the vendor as down.
  const { ctx } = mockCtx([AUTH_FAILED_500]);
  const err = await assertRejects(() => new FirefliesClient(ctx).query("{ user { name } }"));
  assertStringIncludes((err as Error).message, "GraphQL error");
  assertStringIncludes((err as Error).message, "auth_failed");
  // And it must NOT be described in transport terms.
  assertEquals((err as Error).message.includes("500"), false);
});

Deno.test("client: surfaces the error code even when only extensions carries it", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { errors: [{ message: "Too many requests", extensions: { code: "too_many_requests" } }] },
  }]);
  const err = await assertRejects(() => new FirefliesClient(ctx).query("{ x }"));
  assertStringIncludes((err as Error).message, "[too_many_requests]");
});

Deno.test("client: a 200 carrying errors[] still fails (GraphQL answers 200 on failure)", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: null, errors: [{ message: "User not found", code: "object_not_found" }] },
  }]);
  const err = await assertRejects(() => new FirefliesClient(ctx).query("{ x }"));
  assertStringIncludes((err as Error).message, "object_not_found");
});

Deno.test("client: a non-JSON body falls back to the HTTP status", async () => {
  const { ctx } = mockCtx([{ status: 502, statusText: "Bad Gateway", body: "<html>nope</html>" }]);
  const err = await assertRejects(() => new FirefliesClient(ctx).query("{ x }"));
  assertStringIncludes((err as Error).message, "502");
  assertStringIncludes((err as Error).message, "non-JSON");
});

Deno.test("client: a non-ok status with clean JSON and no errors[] still fails", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { somethingElse: true } }]);
  await assertRejects(() => new FirefliesClient(ctx).query("{ x }"));
});

Deno.test("client: null data is an error, not a silent undefined result", async () => {
  const { ctx } = mockCtx([{ body: { data: null } }]);
  const err = await assertRejects(() => new FirefliesClient(ctx).query("{ x }"));
  assertStringIncludes((err as Error).message, "no data");
});

Deno.test("client: returns the data envelope's contents", async () => {
  const { ctx } = mockCtx([{ body: { data: { user: { user_id: "u1" } } } }]);
  const out = await new FirefliesClient(ctx).query<{ user: { user_id: string } }>("{ user }");
  assertEquals(out.user.user_id, "u1");
});

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("client: unset variables never reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new FirefliesClient(ctx).query("query Q($a: String) { x }", { a: "", b: "keep" });
  assertEquals(sent(calls[0]).variables, { b: "keep" });
});

Deno.test("csv: splits and trims, and returns undefined for nothing", () => {
  assertEquals(csv("a@b.com, c@d.com"), ["a@b.com", "c@d.com"]);
  assertEquals(csv(" , , "), undefined);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

Deno.test("intArg: renders an inline literal, omits nothing, and rejects non-integers", () => {
  // Inlining is what sidesteps the Int-vs-Float ambiguity in Fireflies' docs.
  assertEquals(intArg("limit", 25), ", limit: 25");
  assertEquals(intArg("limit", 0), ", limit: 0");
  assertEquals(intArg("limit", undefined), "");
  assertEquals(intArg("limit", null), "");
  // A non-integer is rejected rather than interpolated — this is what keeps
  // inlining injection-safe.
  assertThrows(() => intArg("limit", 1.5), Error, "must be an integer");
  assertThrows(() => intArg("limit", Number.NaN), Error, "must be an integer");
});

Deno.test("errorCode / formatErrors: read the code from either place the vendor puts it", () => {
  assertEquals(errorCode({ code: "forbidden" }), "forbidden");
  assertEquals(errorCode({ extensions: { code: "paid_required" } }), "paid_required");
  assertEquals(errorCode({ message: "bare" }), undefined);
  assertEquals(
    formatErrors([{ message: "a", code: "x" }, { message: "b" }]),
    "a [x]; b",
  );
});
