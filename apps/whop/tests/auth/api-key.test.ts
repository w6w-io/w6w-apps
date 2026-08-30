import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "whop_api_unitTestFixtureNotARealToken00000";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.whop.com/api/v1/memberships",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: TOKEN, accountId: "biz_1" } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.whop.com/api/v1/memberships");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-key: the probe is /permissions, not /users/me", () => {
  assertEquals(PROBE_PATH, "/permissions");
});

Deno.test("api-key: test passes when /permissions answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const result = await apiKey.test(
    { credential: { apiKey: TOKEN, accountId: "biz_1" } },
    ctx,
  );

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/permissions");
  assertEquals(queryOf(calls[0].url).resource_id, "biz_1");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-key: test fails with no apiKey, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { accountId: "biz_1" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test fails with no accountId, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a 401 is reported as a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("unauthorized", "Authentication failed"),
  }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN, accountId: "biz_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a non-401 failure is left ambiguous between the key and accountId", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("invalid_request_error", "bad resource_id"),
  }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN, accountId: "not-a-tag" } }, ctx);
  assertEquals(result.ok, false);
  assert(/accountId/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect echoes accountId only, never apiKey", async () => {
  const display = await apiKey.afterConnect!(
    { credential: { apiKey: TOKEN, accountId: "biz_1" } },
    {} as never,
  );
  assertEquals(display, { accountId: "biz_1" });
  assert(!JSON.stringify(display).includes(TOKEN));
});

Deno.test("api-key: afterConnect returns nothing when accountId is absent", async () => {
  const display = await apiKey.afterConnect!({ credential: { apiKey: TOKEN } }, {} as never);
  assertEquals(display, {});
});
