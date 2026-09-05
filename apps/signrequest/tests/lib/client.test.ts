import { assertEquals, assertRejects } from "@std/assert";
import { compact, jsonArray, resourceUrl, SignRequestClient } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("resourceUrl: builds the full documents resource URL", () => {
  assertEquals(
    resourceUrl("documents", "abc-123"),
    "https://signrequest.com/api/v1/documents/abc-123/",
  );
});

Deno.test("resourceUrl: builds the full templates resource URL and encodes the uuid", () => {
  assertEquals(
    resourceUrl("templates", "a b"),
    "https://signrequest.com/api/v1/templates/a%20b/",
  );
});

Deno.test("compact: drops undefined, null, and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: "x", f: false }), {
    a: 1,
    e: "x",
    f: false,
  });
});

Deno.test("jsonArray: parses a JSON string", () => {
  assertEquals(jsonArray('[{"email":"a@b.com"}]', "signers"), [{ email: "a@b.com" }]);
});

Deno.test("jsonArray: passes an already-parsed array through", () => {
  assertEquals(jsonArray([1, 2], "signers"), [1, 2]);
});

Deno.test("jsonArray: empty/undefined/null input returns []", () => {
  assertEquals(jsonArray(undefined, "signers"), []);
  assertEquals(jsonArray(null, "signers"), []);
  assertEquals(jsonArray("", "signers"), []);
});

Deno.test("jsonArray: rejects a non-array with the param name in the message", () => {
  let message = "";
  try {
    jsonArray('{"email":"a@b.com"}', "signers");
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("signers"), true);
});

Deno.test("SignRequestClient: GET builds the full URL and includes query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await new SignRequestClient(ctx).request("/documents/", { query: { page: 2, limit: 10 } });
  assertEquals(pathOf(calls[0]), "/api/v1/documents/");
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "2");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "10");
});

Deno.test("SignRequestClient: POST sends a JSON body with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "d1" } }]);
  await new SignRequestClient(ctx).request("/documents/", {
    method: "POST",
    body: { name: "NDA" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "NDA" });
});

Deno.test("SignRequestClient: 204 No Content resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new SignRequestClient(ctx).request("/documents/d1/", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("SignRequestClient: surfaces the DRF `detail` error shape", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid token" } }]);
  await assertRejects(
    () => new SignRequestClient(ctx).request("/documents/"),
    Error,
    "Invalid token",
  );
});

Deno.test("SignRequestClient: surfaces the DRF per-field validation error shape", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { signers: ["This field is required."] } }]);
  await assertRejects(
    () => new SignRequestClient(ctx).request("/signrequests/", { method: "POST", body: {} }),
    Error,
    "signers: This field is required.",
  );
});

Deno.test("SignRequestClient: falls back to the raw text when the error body isn't JSON", async () => {
  const { ctx } = mockCtx([
    { status: 502, body: "<html>Bad Gateway</html>", headers: { "content-type": "text/html" } },
  ]);
  await assertRejects(
    () => new SignRequestClient(ctx).request("/documents/"),
    Error,
    "Bad Gateway",
  );
});
