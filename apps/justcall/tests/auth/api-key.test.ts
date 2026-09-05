import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "unitTestFixtureKey";
const SECRET = "unitTestFixtureSecret";

Deno.test("api-key: sign stamps the raw key:secret pair, never Base64", () => {
  const request = {
    method: "GET",
    url: "https://api.justcall.io/v2.1/calls",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: KEY, apiSecret: SECRET } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, `${KEY}:${SECRET}`);
  // Not HTTP Basic auth — no "Basic " prefix, no Base64 encoding.
  assert(!signed.headers.authorization.startsWith("Basic "));
  assert(!signed.headers.authorization.includes(btoa(`${KEY}:${SECRET}`)));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY, apiSecret: SECRET }), {
    authorization: `${KEY}:${SECRET}`,
  });
});

Deno.test("api-key: the probe is GET /users, JustCall's cheapest always-reachable read", () => {
  assertEquals(PROBE_PATH, "/users");
});

Deno.test("api-key: test passes when the probe answers ok", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1 }]) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, apiSecret: SECRET } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2.1/users");
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
  assertEquals(calls[0].headers.authorization, `${KEY}:${SECRET}`);
});

Deno.test("api-key: test fails with no credential, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test never echoes the probe's response body back to the caller", async () => {
  const { ctx } = mockCtx([
    { body: envelope([{ id: 1, name: "Real Agent Name", email: "agent@example.com" }]) },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY, apiSecret: SECRET } }, ctx);

  assert(!JSON.stringify(result).includes("Real Agent Name"));
  assert(!JSON.stringify(result).includes("agent@example.com"));
});

/**
 * JustCall does not distinguish a missing credential from a rejected one —
 * both answer identically. This pins that measured fact so a future change
 * that starts inventing a distinction the API does not make gets noticed.
 */
Deno.test("api-key: a 401 is reported without claiming to know which failure mode it is", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, apiSecret: SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(/does not distinguish/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 403 is reported as a plan restriction", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, apiSecret: SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(/Team plan/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 429 says the credential could not be verified, not that it is bad", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody("Too many requests") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, apiSecret: SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(/says nothing about the credential/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, apiSecret: SECRET } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: the credential fields are declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
