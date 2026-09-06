import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealLivestormToken00000";

Deno.test("api-key: sign stamps the raw header — no Bearer prefix", () => {
  const request = {
    method: "GET",
    url: "https://api.livestorm.co/v1/ping",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, TOKEN);
  assert(!signed.headers.authorization.startsWith("Bearer "));
  assertEquals(signed.url, "https://api.livestorm.co/v1/ping");
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: TOKEN });
});

Deno.test("api-key: the probe is /ping", () => {
  assertEquals(PROBE_PATH, "/ping");
});

Deno.test("api-key: test passes on a 200 with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await apiKey.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/ping");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, TOKEN);
  assert(!calls[0].headers.authorization.startsWith("Bearer "));
});

Deno.test("api-key: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a 401 unauthorized body is reported as a rejected token", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody("unauthorized", "Unauthorized", "you need to verify your authentication"),
    },
  ]);
  const result = await apiKey.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
  assert(/unauthorized/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 403 is reported as a workspace-blocked refusal", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("forbidden", "Forbidden") }]);
  const result = await apiKey.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/workspace blocked/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

/**
 * `afterConnect` reads `/organization`, never `/me` — see `lib/client.ts`'s module doc for why
 * `/me`'s documented schema cannot be trusted.
 */
Deno.test("api-key: afterConnect reads /organization, publishing the organization name", async () => {
  const { ctx, calls } = mockCtx([{ body: single("organizations", "org1", { name: "Acme Co" }) }]);
  const display = await apiKey.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/organization");
  assertEquals(display, { organizationName: "Acme Co", organizationId: "org1" });
});

Deno.test("api-key: afterConnect stays silent when the organization read fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("forbidden", "no") }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-key: afterConnect stays silent when the response carries no name", async () => {
  const { ctx } = mockCtx([{ body: single("organizations", "org1", {}) }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
