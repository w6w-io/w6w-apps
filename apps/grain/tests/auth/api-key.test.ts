import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_VERSION } from "../../lib/client.ts";
import apiKey from "../../auth/api-key.ts";

Deno.test("api-key: sign stamps Authorization: Bearer <token>", () => {
  const request = {
    url: "https://api.grain.com/_/public-api/v2/teams",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const result = apiKey.sign!({ request, credential: { token: "tok_123" } }, mockCtx().ctx);
  assertEquals((result as typeof request).headers["authorization"], "Bearer tok_123");
});

Deno.test("api-key: test posts to /v2/teams with the version header and an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { teams: [] } }]);
  const result = await apiKey.test({ credential: { token: "tok_123" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/teams");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["public-api-version"], API_VERSION);
  assertEquals(calls[0].headers["authorization"], "Bearer tok_123");
  assertEquals(calls[0].body, "{}");
});

Deno.test("api-key: test fails without leaking the credential when Grain rejects it", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "invalid token" }]);
  const result = await apiKey.test({ credential: { token: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("401"), true);
  assertEquals(result.message?.includes("bad"), false);
});

Deno.test("api-key: test reports missing credential without calling the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result, { ok: false, message: "credential missing token" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: declares a single required secret field", () => {
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});

Deno.test("api-key: declares no afterConnect (Grain publishes no whoami)", () => {
  assertEquals(apiKey.afterConnect, undefined);
});

Deno.test("api-key: declares no oauth2 config", () => {
  assertEquals(apiKey.oauth2, undefined);
});
