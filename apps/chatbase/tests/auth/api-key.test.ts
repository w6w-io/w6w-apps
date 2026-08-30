import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

const KEY = "cb_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://www.chatbase.co/api/v2/agents",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://www.chatbase.co/api/v2/agents");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

/** Pinned here (as well as in health/quota) — this is what the quota check shares the call with. */
Deno.test("api-key: the probe is /agents, not the unauthenticated /health", () => {
  assertEquals(PROBE_PATH, "/agents");
});

Deno.test("api-key: test passes and requests limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "a1" }]) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/agents");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: an empty workspace (data: []) still passes", async () => {
  const { ctx } = mockCtx([{ body: page([]) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result, { ok: true });
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a missing Authorization header is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("AUTH_MISSING_API_KEY", "No Authorization header present.") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no Authorization header/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an invalid key is reported as rejected, distinct from a missing one", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("AUTH_INVALID_API_KEY", "The API key is not valid.") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a plan restriction is reported as an upgrade issue, not a bad key", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("SUBSCRIPTION_API_RESTRICTED_PLAN", "Your plan does not include API access."),
    },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/does not include API v2 access/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});
