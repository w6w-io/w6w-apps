import { assertEquals, assertStringIncludes } from "@std/assert";
import { apiHostFrom, compact, jsonArray, jsonObject, SignNowClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("apiHostFrom: reads the connected apiHost", () => {
  const { ctx } = mockCtx([], { display: { apiHost: "api-eval.signnow.com" } });
  assertEquals(apiHostFrom(ctx.connection), "api-eval.signnow.com");
});

Deno.test("apiHostFrom: defaults to production when no Connection is present", () => {
  const { ctx } = mockCtx([], { display: null });
  assertEquals(apiHostFrom(ctx.connection), "api.signnow.com");
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("jsonArray: parses a JSON string and passes through an array", () => {
  assertEquals(jsonArray('["a","b"]', "x"), ["a", "b"]);
  assertEquals(jsonArray(["a"], "x"), ["a"]);
  assertEquals(jsonArray(undefined, "x"), []);
});

Deno.test("jsonArray: rejects a non-array", () => {
  let threw = false;
  try {
    jsonArray('{"a":1}', "x");
  } catch (err) {
    threw = true;
    assertStringIncludes((err as Error).message, "`x`");
  }
  assertEquals(threw, true);
});

Deno.test("jsonObject: parses a JSON string and passes through an object", () => {
  assertEquals(jsonObject('{"a":1}', "x"), { a: 1 });
  assertEquals(jsonObject(undefined, "x"), {});
});

Deno.test("jsonObject: rejects an array or scalar", () => {
  let threw = false;
  try {
    jsonObject("[1,2]", "x");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("SignNowClient: builds requests against https://{apiHost}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "doc-1" } }], {
    display: { apiHost: "api-eval.signnow.com" },
  });
  const client = new SignNowClient(ctx);
  assertEquals(client.apiBase, "https://api-eval.signnow.com");
  await client.request("/document/doc-1");
  assertEquals(calls[0].url, "https://api-eval.signnow.com/document/doc-1");
});

Deno.test("SignNowClient: surfaces the vendor's `error`/`error_description` on failure", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error: "invalid_token", code: 1537 } },
  ]);
  const client = new SignNowClient(ctx);
  let threw = false;
  try {
    await client.request("/user");
  } catch (err) {
    threw = true;
    assertStringIncludes((err as Error).message, "invalid_token");
    assertStringIncludes((err as Error).message, "400");
  }
  assertEquals(threw, true);
});

Deno.test("SignNowClient: returns undefined for a 204 response", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new SignNowClient(ctx);
  const out = await client.request("/api/v2/events", { method: "POST", body: {} });
  assertEquals(out, undefined);
});

Deno.test("SignNowClient: never sends its own authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new SignNowClient(ctx).request("/user");
  assertEquals(calls[0].headers["authorization"], undefined);
});
