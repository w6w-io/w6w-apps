import { assert, assertEquals } from "@std/assert";
import apiKeyAuth, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf, problemBody } from "../_helpers.ts";

const KEY = "sio_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps X-API-Key and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.systeme.io/api/contacts",
    headers: {} as Record<string, string>,
  };
  const signed = apiKeyAuth.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["x-api-key"], KEY);
  assertEquals(signed.headers.authorization, undefined);
  assertEquals(signed.url, "https://api.systeme.io/api/contacts");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { "x-api-key": KEY });
});

Deno.test("api-key: the probe is /api/contact_fields, never a contact-PII endpoint", () => {
  assertEquals(PROBE_PATH, "/api/contact_fields");
});

Deno.test("api-key: test passes when the probe answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], hasMore: false } }]);
  const result = await apiKeyAuth.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/contact_fields");
  assertEquals(calls[0].headers["x-api-key"], KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKeyAuth.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Two genuinely distinct 401s (confirmed live 2026-08-24): a missing header
 * carries no `WWW-Authenticate`, a wrong key does. This app must report them
 * as different problems, not collapse both into one generic message.
 */
Deno.test("api-key: a missing-credential 401 (no WWW-Authenticate) is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: problemBody("Full authentication is required to access this resource."),
    },
  ]);
  const result = await apiKeyAuth.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a wrong-key 401 (with WWW-Authenticate) is reported as a rejected key", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: {
        "content-type": "application/problem+json",
        "www-authenticate": "API Key",
      },
      body: problemBody("Invalid API Key."),
    },
  ]);
  const result = await apiKeyAuth.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the key/i.test(result.message ?? ""), result.message);
  assert(/Invalid API Key\./.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKeyAuth.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});
