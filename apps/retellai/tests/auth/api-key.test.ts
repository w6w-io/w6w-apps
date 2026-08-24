import { assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { documentedError, headerMissingError, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: sign() stamps a Bearer header and does not call fetch", () => {
  const request = { headers: {} as Record<string, string>, url: "https://api.retellai.com/x" };
  const out = apiKey.sign!({ request, credential: { apiKey: "key_123" } } as never, {} as never);
  assertEquals((out as typeof request).headers.authorization, "Bearer key_123");
});

Deno.test("api-key: authHeaders builds the exact documented format", () => {
  assertEquals(authHeaders({ apiKey: "abc" }), { authorization: "Bearer abc" });
});

Deno.test("api-key: test() succeeds when the probe returns 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { org_name: "Acme", api_key_name: "prod" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "key_123" } } as never, ctx);
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(result.ok, true);
});

Deno.test("api-key: test() reports the vendor's documented shape for an invalid key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: documentedError("Invalid API Key.") }]);
  const result = await apiKey.test!({ credential: { apiKey: "wrong" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Invalid API Key."), true);
});

/**
 * The finding this app exists to not miss: a missing Authorization header
 * answers a DIFFERENT, undocumented shape than every other error. A `test()`
 * that only reads `body.message` would report this case as an opaque
 * "HTTP 401" instead of naming the real problem.
 */
Deno.test("api-key: test() reads the UNDOCUMENTED error_message shape for a missing header", async () => {
  const { ctx } = mockCtx([{ status: 401, body: headerMissingError() }]);
  const result = await apiKey.test!({ credential: { apiKey: "key_123" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Authorization header required"), true);
});

Deno.test("api-key: test() fails locally on a blank credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { apiKey: "" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes org_name and api_key_name, nothing else", async () => {
  const { ctx } = mockCtx([{ body: { org_name: "Acme Inc", api_key_name: "My Key" } }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "key_123" } } as never, ctx);
  assertEquals(out, { orgName: "Acme Inc", apiKeyName: "My Key" });
});

Deno.test("api-key: afterConnect omits api_key_name when the vendor returns none", async () => {
  const { ctx } = mockCtx([{ body: { org_name: "Acme Inc", api_key_name: null } }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "key_123" } } as never, ctx);
  assertEquals(out, { orgName: "Acme Inc" });
});

Deno.test("api-key: afterConnect fails silently — a bad probe must not break a good connection", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "key_123" } } as never, ctx);
  assertEquals(out, {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
