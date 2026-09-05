import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const credential = {
  baseUrl: "https://erpnext.example.com",
  apiKey: "the-api-key",
  apiSecret: "the-api-secret",
};

Deno.test("sign: stamps `token <key>:<secret>` on the Authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://erpnext.example.com/api/resource/Customer",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const signed = await apiKey.sign!({ request, credential }, ctx);
  assertEquals(signed.headers["authorization"], "token the-api-key:the-api-secret");
});

Deno.test("test: a 200 is a pass and never echoes the secret", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "bot@example.com" } }]);
  const result = await apiKey.test!({ credential }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].headers["authorization"], "token the-api-key:the-api-secret");
  assert(!JSON.stringify(result).includes("the-api-secret"), "test result echoed the secret");
});

/** AuthenticationError → HTTP 401, verified against frappe/exceptions.py. */
Deno.test("test: a 401 is a rejected credential, not a server error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await apiKey.test!({ credential }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("401"), result.message);
});

Deno.test("test: a 403 is diagnosed as a scope problem, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await apiKey.test!({ credential }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("403"), result.message);
});

Deno.test("test: a 404 is diagnosed as a wrong site URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await apiKey.test!({ credential }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("site URL"), result.message);
});

Deno.test("test: missing credential fields fail before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { baseUrl: credential.baseUrl } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records the site and the resolved user, never the secret", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { message: "bot@example.com" } }]);
  const display = await apiKey.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.baseUrl, "https://erpnext.example.com");
  assertEquals(display.user, "bot@example.com");
  assert(!("apiSecret" in display), "afterConnect published the secret");
  assert(!("apiKey" in display), "afterConnect published the key");
});

Deno.test("afterConnect: a failed lookup still records the site", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const display = await apiKey.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.baseUrl, "https://erpnext.example.com");
  assertEquals(display.user, undefined);
});
