import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "airtop_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.airtop.ai/api/v1/sessions",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://api.airtop.ai/api/v1/sessions");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is GET /v1/sessions", () => {
  assertEquals(PROBE_PATH, "/v1/sessions");
});

Deno.test("api-key: test passes when the session list answers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ sessions: [], pagination: {} }) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v1/sessions");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a missing credential is reported as never having reached the request", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("missing required header authorization"),
  }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no credential/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an invalid key is reported as rejected, distinct from a missing one", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("invalid api key") }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the api key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(apiKey.type, "bearer");
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
