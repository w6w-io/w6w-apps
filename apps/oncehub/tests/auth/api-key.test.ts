import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiKey from "../../auth/api-key.ts";

Deno.test("api-key: sign stamps the raw key onto the API-Key header, no prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.oncehub.com/v2/bookings",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!({ request, credential: { apiKey: "sk_live_abc123" } }, ctx);
  assertEquals(out.headers["API-Key"], "sk_live_abc123");
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("api-key: test() calls GET /v2/test with the key and reports ok on 200", async () => {
  const { ctx, calls } = mockCtx([
    { body: { message: "The API key is valid for account: admin@example.com" } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "sk_live_abc123" } }, ctx);
  assertEquals(calls[0].url, "https://api.oncehub.com/v2/test");
  assertEquals(calls[0].headers["api-key"], "sk_live_abc123");
  assertEquals(result.ok, true);
  assertEquals(result.message, "The API key is valid for account: admin@example.com");
});

Deno.test("api-key: test() classifies failure from the body's authentication_error, not just the status", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { type: "authentication_error", message: "Invalid API key." } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "bad-key" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Invalid API key.");
});

Deno.test("api-key: test() fails locally without hitting the network when the credential is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect extracts the account email from the test message", async () => {
  const { ctx } = mockCtx([
    { body: { message: "The API key is valid for account: someone@example.com" } },
  ]);
  const result = await apiKey.afterConnect!({ credential: {} }, ctx);
  assertEquals((result as { account?: { email?: string } }).account?.email, "someone@example.com");
});
