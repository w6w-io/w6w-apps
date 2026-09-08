import { assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-key: sign() sets X-API-Key", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://public-api.process.st/api/v1.1/testAuth",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "key_123" } }, ctx);
  assertEquals(out.headers["x-api-key"], "key_123");
});

Deno.test("test(): missing apiKey fails without calling the network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test(): a live key calling /testAuth passes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { apiKeyLabel: "My Key" } }]);
  const result = await auth.test({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/testAuth");
  assertEquals(calls[0].headers["x-api-key"], "key_123");
});

Deno.test("test(): 401 with no errorCode still fails with a message, never the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Unable to verify credentials." } }]);
  const result = await auth.test({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("key_123"), false);
  assertEquals(result.message?.includes("Organization Settings"), true);
});

Deno.test("test(): an unexpected status still fails with detail, not a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("afterConnect: records apiKeyLabel, never the key", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { apiKeyLabel: "My Key" } }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(display, { apiKeyLabel: "My Key" });
  assertEquals(JSON.stringify(display).includes("key_123"), false);
});

Deno.test("afterConnect: a failed lookup returns an empty display rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(display, {});
});
