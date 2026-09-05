import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-key: authHeaders builds the documented Bearer form", () => {
  assertEquals(authHeaders({ apiKey: "sk-test-123" }), { authorization: "Bearer sk-test-123" });
});

Deno.test("api-key: sign stamps the Authorization header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.hedy.bot/sessions",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: "sk-test-123" } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, "Bearer sk-test-123");
  assertEquals(signed.url, "https://api.hedy.bot/sessions");
  assert(!signed.url.includes("sk-test-123"));
});

Deno.test("api-key: test() succeeds on a schema-correct success body", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, data: [{ id: "sess_1" }], pagination: { total: 1 } } },
  ]);
  const out = await apiKey.test({ credential: { apiKey: "sk-live-good" } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(pathOf(calls[0].url), "/sessions");
  assertEquals(queryOf(calls[0].url).limit, "1");
  assertEquals(calls[0].headers.authorization, "Bearer sk-live-good");
});

Deno.test("api-key: test() reports a missing credential without ever reaching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: "" } } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0, "an empty credential must not be sent to Hedy at all");
});

Deno.test("api-key: test() distinguishes missing_api_key from invalid_api_key", async () => {
  const { ctx: ctxMissing } = mockCtx([
    {
      status: 401,
      body: { success: false, error: { code: "missing_api_key", message: "Missing API key" } },
    },
  ]);
  const missing = await apiKey.test({ credential: { apiKey: "whatever" } } as never, ctxMissing);
  assertEquals(missing.ok, false);
  assert(missing.message?.includes("did not reach the request"));

  const { ctx: ctxInvalid } = mockCtx([
    {
      status: 401,
      body: {
        success: false,
        error: { code: "invalid_api_key", message: "Invalid API key format" },
      },
    },
  ]);
  const invalid = await apiKey.test({ credential: { apiKey: "bad-key" } } as never, ctxInvalid);
  assertEquals(invalid.ok, false);
  assert(invalid.message?.includes("rejected the key"));
});

/**
 * The gotcha this app documents: a genuinely unknown route answers 404 with
 * plain HTML, not this API's JSON error shape. `test()` must not crash trying
 * to parse it, and must not report it as a credential problem.
 */
Deno.test("api-key: test() survives a non-JSON 404 body without crashing", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: "<!DOCTYPE html><html><body><pre>Cannot GET /sessions</pre></body></html>",
    },
  ]);
  const out = await apiKey.test({ credential: { apiKey: "sk-live-good" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("404"));
});

Deno.test("api-key: test() reports a 429 as inconclusive, not as a bad key", async () => {
  const { ctx } = mockCtx([
    {
      status: 429,
      body: {
        success: false,
        error: { code: "rate_limit_exceeded", message: "Too many requests" },
      },
    },
  ]);
  const out = await apiKey.test({ credential: { apiKey: "sk-live-good" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.toLowerCase().includes("rate-limiting"));
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});

Deno.test("api-key: uses the apiKey auth type with the documented header + prefix", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
});
