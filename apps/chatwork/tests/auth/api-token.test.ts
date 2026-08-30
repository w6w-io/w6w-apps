import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, TOKEN_HEADER } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-token: TOKEN_HEADER is the vendor's documented casing", () => {
  assertEquals(TOKEN_HEADER, "X-ChatWorkToken");
});

Deno.test("api-token: authHeaders sends the token under the ChatWork header", () => {
  const headers = authHeaders({ apiToken: "tok_123" });
  assertEquals(headers[TOKEN_HEADER], "tok_123");
});

Deno.test("api-token: sign stamps the header and never calls the network", () => {
  const request = {
    url: "https://api.chatwork.com/v2/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = apiToken.sign!({ request, credential: { apiToken: "tok_abc" } }, {} as never);
  assertEquals((out as typeof request).headers[TOKEN_HEADER], "tok_abc");
});

Deno.test("api-token: test succeeds on a 200 from GET /me", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: 1, name: "Taro" } }]);
  const result = await apiToken.test({ credential: { apiToken: "tok_abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/v2/me");
  assertEquals(calls[0].headers[TOKEN_HEADER.toLowerCase()], "tok_abc");
});

Deno.test("api-token: test reports missing credential without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Live-confirmed 2026-08-29: an unauthenticated GET /me and a bogus-token
 * GET /me both answer 401 with the identical body — the vendor's own message
 * does not distinguish the two cases, so `test`'s message must not invent a
 * distinction either.
 */
Deno.test("api-token: test surfaces the vendor's uniform 401 message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Invalid API Token") }]);
  const result = await apiToken.test({ credential: { apiToken: "bogus" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
  assert(!result.message?.includes("undefined"));
});

Deno.test("api-token: afterConnect publishes name and chatwork_id, nothing else", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      account_id: 1,
      name: "Taro Yamada",
      chatwork_id: "taroyamada",
      mail: "taro@example.com",
    },
  }]);
  const out = await apiToken.afterConnect!({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(out, { name: "Taro Yamada", chatworkId: "taroyamada" });
});

Deno.test("api-token: afterConnect fails silently on a bad response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Invalid API Token") }]);
  const out = await apiToken.afterConnect!({ credential: { apiToken: "tok" } }, ctx);
  assertEquals(out, {});
});

Deno.test("api-token: the credential field is declared secret", () => {
  for (const f of apiToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(apiToken.apiKey?.name, TOKEN_HEADER);
  assertEquals(apiToken.apiKey?.in, "header");
});
