import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, newErrorBody } from "../_helpers.ts";

Deno.test("api-key: authHeaders sends the raw key, no Bearer prefix", () => {
  assertEquals(authHeaders({ apiKey: "sk_live_123" }), { authorization: "sk_live_123" });
});

Deno.test("api-key: authHeaders tolerates a missing key", () => {
  assertEquals(authHeaders({}), { authorization: "" });
});

Deno.test("api-key: sign stamps the authorization header and returns the request", () => {
  const request = {
    url: "https://api.bland.ai/v1/calls",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = apiKey.sign!({ request, credential: { apiKey: "sk_live_123" } }, {} as never);
  assertEquals((out as typeof request).headers.authorization, "sk_live_123");
});

Deno.test("api-key: sign never sets a Bearer-prefixed header", () => {
  const request = {
    url: "https://api.bland.ai/v1/calls",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = apiKey.sign!(
    { request, credential: { apiKey: "sk_live_123" } },
    {} as never,
  ) as typeof request;
  assertEquals(out.headers.authorization.startsWith("Bearer "), false);
});

Deno.test("api-key: test fails fast when the credential is missing apiKey", async () => {
  const { ctx } = mockCtx([]);
  const result = await apiKey.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: test succeeds on a 200 from GET /v1/me", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "active" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.bland.ai/v1/me");
  assertEquals(calls[0].headers.authorization, "sk_live_123");
});

Deno.test("api-key: test reports a readable message on 401 AUTH_FAILURE", async () => {
  const { ctx } = mockCtx([{ status: 401, body: newErrorBody("AUTH_FAILURE", "Unauthorized") }]);
  const result = await apiKey.test!({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(/rejected the API key/.test(result.message ?? ""), true);
});

Deno.test("api-key: test reports account-flagged on 403", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: "error", message: "flagged" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(/flagged/.test(result.message ?? ""), true);
});

Deno.test("api-key: test falls back to a formatted error for anything else", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const result = await apiKey.test!({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(/Bland 500/.test(result.message ?? ""), true);
});
