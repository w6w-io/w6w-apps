import { assert, assertEquals } from "@std/assert";
import bearerToken, { authHeaders, PROBE_PATH } from "../../auth/bearer-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const API_KEY = "bb_ak_v5_unitTestFixtureNotARealKey00000";

Deno.test("bearer-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.bannerbear.com/v5/images",
    headers: {} as Record<string, string>,
  };
  const signed = bearerToken.sign!({ request, credential: { apiKey: API_KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${API_KEY}`);
  assertEquals(signed.url, "https://api.bannerbear.com/v5/images");
  assert(!signed.url.includes(API_KEY));
});

Deno.test("bearer-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: API_KEY }), { authorization: `Bearer ${API_KEY}` });
});

/**
 * The probe is pinned here as well as in the entry-module tests, because this
 * is the file someone edits when they decide a resource list is a fine probe
 * — and a resource list is exactly what a correctly-scoped key may be
 * refused.
 */
Deno.test("bearer-token: the probe is /account, not a scoped resource list", () => {
  assertEquals(PROBE_PATH, "/account");
});

Deno.test("bearer-token: test passes when /account answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "w1", workspace: "Acme" } }]);
  const result = await bearerToken.test({ credential: { apiKey: API_KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/account");
  assertEquals(calls[0].headers.authorization, `Bearer ${API_KEY}`);
});

Deno.test("bearer-token: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await bearerToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("bearer-token: a 401 is reported as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthorized") }]);
  const result = await bearerToken.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: a 403 is reported as a refusal, with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("scope does not permit this") }]);
  const result = await bearerToken.test({ credential: { apiKey: API_KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused the account read/i.test(result.message ?? ""), result.message);
  assert(/scope does not permit this/.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await bearerToken.test({ credential: { apiKey: API_KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: afterConnect publishes only the workspace name", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        uid: "w1",
        workspace: "Acme",
        plan: "pro",
        api_key: { name: "prod", scopes: [], allowed_origins: [] },
      },
    },
  ]);
  const display = await bearerToken.afterConnect!({ credential: { apiKey: API_KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/account");
  assertEquals(display, { workspace: "Acme" });
});

Deno.test("bearer-token: afterConnect stays silent when /account fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("no") }]);
  assertEquals(await bearerToken.afterConnect!({ credential: { apiKey: API_KEY } }, ctx), {});
});

Deno.test("bearer-token: afterConnect stays silent when the response carries no workspace", async () => {
  const { ctx } = mockCtx([{ body: { uid: "w1" } }]);
  assertEquals(await bearerToken.afterConnect!({ credential: { apiKey: API_KEY } }, ctx), {});
});

Deno.test("bearer-token: the credential field is declared secret", () => {
  for (const f of bearerToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
