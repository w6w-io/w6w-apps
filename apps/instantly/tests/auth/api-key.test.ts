import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "instantly_api_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.instantly.ai/api/v2/campaigns",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  // Instantly has no query-param auth form; the URL must stay untouched.
  assertEquals(signed.url, "https://api.instantly.ai/api/v2/campaigns");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is /campaigns, not /workspaces/current", () => {
  assertEquals(PROBE_PATH, "/campaigns");
});

Deno.test("api-key: test passes when the campaigns list answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a missing header is reported as never having reached the request", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(401, "Unauthorized", "Missing authorization header") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no key/i.test(result.message ?? ""), result.message);
});

Deno.test('api-key: an invalid key is reported as rejected, not as "no key"', async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(401, "Unauthorized", "Invalid API key") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the key/i.test(result.message ?? ""), result.message);
  assert(/Invalid API key/.test(result.message ?? ""), result.message);
});

/**
 * A key without `campaigns:read` is a valid, supported configuration (see the
 * module doc) — this must be distinguished from a bad key, not collapsed.
 */
Deno.test("api-key: a 403 is reported as a scope refusal, not a bad key", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody(
        403,
        "Forbidden",
        "This request is forbidden (the API key scope or " +
          "workspace plan does not allow this action)",
      ),
    },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/not scoped for Campaigns/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 402 is reported as a plan problem", async () => {
  const { ctx } = mockCtx([
    { status: 402, body: errorBody(402, "Payment Required", "no active paid plan") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/paid plan/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

/**
 * `afterConnect` is the one place this app calls `GET /workspaces/current`,
 * which needs a scope `test` does not require — it must fail silently.
 */
Deno.test("api-key: afterConnect publishes the workspace name and id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", name: "Acme Outreach" } }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/workspaces/current");
  assertEquals(display, { workspaceName: "Acme Outreach", workspaceId: "w1" });
});

Deno.test("api-key: afterConnect stays silent when scoped away from workspaces:read", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody(403, "Forbidden", "insufficient scope") },
  ]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: afterConnect stays silent when the response carries no name", async () => {
  const { ctx } = mockCtx([{ body: { id: "w1" } }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(apiKey.type, "bearer");
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
