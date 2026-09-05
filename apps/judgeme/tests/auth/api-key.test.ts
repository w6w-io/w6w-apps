import { assert, assertEquals } from "@std/assert";
import apiKey, { AUTH_FAILURE_MESSAGE, authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "jm_api_key_unitTestFixtureNotReal00000";
const SHOP = "example.myshopify.com";

Deno.test("api-key: sign stamps the header and the shop_domain query param", () => {
  const request = {
    method: "GET",
    url: "https://api.judge.me/api/v1/reviews",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: KEY, shopDomain: SHOP } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers["x-api-token"], KEY);
  assertEquals(queryOf(signed.url).shop_domain, SHOP);
  assertEquals(pathOf(signed.url), "/api/v1/reviews");
});

Deno.test("api-key: sign preserves any existing query parameters", () => {
  const request = {
    method: "GET",
    url: "https://api.judge.me/api/v1/reviews?page=2",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: KEY, shopDomain: SHOP } },
    {} as never,
  ) as { url: string };

  assertEquals(queryOf(signed.url).page, "2");
  assertEquals(queryOf(signed.url).shop_domain, SHOP);
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { "x-api-token": KEY });
});

Deno.test("api-key: the probe is /settings", () => {
  assertEquals(PROBE_PATH, "/settings");
});

Deno.test("api-key: test passes when /settings answers with a settings object", async () => {
  const { ctx, calls } = mockCtx([{ body: { settings: { autopublish: true } } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, shopDomain: SHOP } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v1/settings");
  assertEquals(queryOf(calls[0].url).shop_domain, SHOP);
  assertEquals(calls[0].headers["x-api-token"], KEY);
});

Deno.test("api-key: test fails with no apiKey, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { shopDomain: SHOP } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test fails with no shopDomain, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The vendor's own generic message, matched exactly — and the reason `test`
 * warns that it covers two different mistakes rather than picking one.
 */
Deno.test("api-key: a rejected credential reports the vendor's exact ambiguous message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(AUTH_FAILURE_MESSAGE) }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage", shopDomain: SHOP } }, ctx);

  assertEquals(result.ok, false);
  assert(result.message?.includes(AUTH_FAILURE_MESSAGE));
  assert(/does not say which/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an unrecognised failure still reports the status and body", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("internal error") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, shopDomain: SHOP } }, ctx);

  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
  assert(result.message?.includes("internal error"));
});

Deno.test("api-key: the credential field is declared secret", () => {
  const secretField = apiKey.fields?.find((f) => f.key === "apiKey");
  assertEquals(secretField?.type, "secret");
  const domainField = apiKey.fields?.find((f) => f.key === "shopDomain");
  assertEquals(domainField?.required, true);
});
