import { assert, assertEquals } from "@std/assert";
import bearerToken, { authHeaders, PROBE_PATH } from "../../auth/bearer-token.ts";
import { errorBody, listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealApiKey00000";

Deno.test("bearer-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://app.jobnimbus.com/api1/contacts",
    headers: {} as Record<string, string>,
  };
  const signed = bearerToken.sign!({ request, credential: { apiKey: TOKEN } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("bearer-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("bearer-token: the probe is /contacts, not an account/settings endpoint", () => {
  assertEquals(PROBE_PATH, "/contacts");
});

Deno.test("bearer-token: test passes when the contacts read answers", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  const result = await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api1/contacts");
  assertEquals(queryOf(calls[0].url), { size: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("bearer-token: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await bearerToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * JobNimbus's own 401 is byte-identical for a missing token and a wrong one
 * — `{"status":401,"body":"Authentication required"}` — so this app cannot
 * (and does not pretend to) tell those two cases apart from the response.
 */
Deno.test("bearer-token: a rejected key is reported from the response body, not guessed from the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(401, "Authentication required") }]);
  const result = await bearerToken.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the api key/i.test(result.message ?? ""), result.message);
  assert(/authentication required/i.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: a 403 is reported as a scoping problem, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden") }]);
  const result = await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/access profile/i.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: an unexpected status is reported verbatim rather than swallowed", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await bearerToken.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: the credential field is declared secret", () => {
  assertEquals(bearerToken.type, "bearer");
  for (const f of bearerToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
