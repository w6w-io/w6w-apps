import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-key: sign() stamps Authorization: Bearer <key>", () => {
  const request = { url: "https://api.opus.pro/api/social-accounts", method: "GET", headers: {} };
  const out = apiKey.sign!(
    { request, credential: { apiKey: "sk-abc123" } },
    mockCtx().ctx,
  ) as { headers: Record<string, string> };
  assertEquals(out.headers["authorization"], "Bearer sk-abc123");
});

Deno.test("authHeaders: builds the bearer header from a partial credential", () => {
  assertEquals(authHeaders({ apiKey: "sk-x" }), { authorization: "Bearer sk-x" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("api-key.test: probes GET /api/social-accounts?q=mine", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await apiKey.test({ credential: { apiKey: "sk-live" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/social-accounts");
  assertEquals(queryOf(calls[0].url), { q: "mine" });
  assertEquals(calls[0].headers["authorization"], "Bearer sk-live");
  assertEquals(out, { ok: true });
});

Deno.test("api-key.test: a plain-text 401 Unauthorized body is classified as a rejected credential", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: "Unauthorized", headers: { "content-type": "text/plain" } },
  ]);
  const out = await apiKey.test({ credential: { apiKey: "bogus" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("401"), `expected a 401-mentioning message, got: ${out.message}`);
});

Deno.test("api-key.test: missing apiKey fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key.test: a 403 monthly-cap body is reported via the shared error formatter", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: { code: "API_MONTHLY_CAP_REACHED", reset_at: "2026-10-01T00:00:00Z" },
    },
  ]);
  const out = await apiKey.test({ credential: { apiKey: "sk-live" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("API_MONTHLY_CAP_REACHED"));
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.type, "bearer");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
