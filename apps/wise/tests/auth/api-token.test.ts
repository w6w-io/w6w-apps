import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { authErrorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "wise_api_unitTestFixtureNotARealToken00000";

Deno.test("api-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.wise.com/2026Q3/profiles",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.wise.com/2026Q3/profiles");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

/**
 * The probe is pinned here as well as in the entry-module tests, because this
 * is the file someone edits when they reach for a shorter-looking whoami.
 */
Deno.test("api-token: the probe is GET /profiles", () => {
  assertEquals(PROBE_PATH, "/profiles");
});

Deno.test("api-token: test passes when /profiles answers", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, type: "PERSONAL" }] }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: a missing token on the wire is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: authErrorBody("missing_token", "Missing token") },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no token/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: an invalid token is reported as a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: authErrorBody("invalid_token", "Invalid token") }]);
  const result = await apiToken.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: afterConnect publishes the PERSONAL profile's id and type", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 10, type: "BUSINESS" }, { id: 20, type: "PERSONAL" }] },
  ]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles");
  assertEquals(display, { profileId: 20, profileType: "PERSONAL" });
});

Deno.test("api-token: afterConnect falls back to the first profile when none is PERSONAL", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 10, type: "BUSINESS" }] }]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(display, { profileId: 10, profileType: "BUSINESS" });
});

Deno.test("api-token: afterConnect stays silent when the request fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: authErrorBody("forbidden", "no") }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-token: afterConnect stays silent when the response carries no profiles", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-token: the credential field is declared secret", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "bearer");
  for (const f of apiToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiToken.test, "function");
  assertEquals(typeof apiToken.sign, "function");
});
