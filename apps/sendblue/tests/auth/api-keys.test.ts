import { assert, assertEquals } from "@std/assert";
import apiKeys, { authHeaders, PROBE_PATH } from "../../auth/api-keys.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const CRED = { apiKeyId: "key-123", apiSecretKey: "secret-456" };

Deno.test("api-keys: sign stamps both headers and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.sendblue.co/api/v2/messages",
    headers: {} as Record<string, string>,
  };
  const signed = apiKeys.sign!({ request, credential: CRED }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["sb-api-key-id"], "key-123");
  assertEquals(signed.headers["sb-api-secret-key"], "secret-456");
  // No bearer prefix, no query-string form — the URL is untouched.
  assertEquals(signed.url, "https://api.sendblue.co/api/v2/messages");
  assert(!signed.url.includes("key-123"));
});

Deno.test("api-keys: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders(CRED), {
    "sb-api-key-id": "key-123",
    "sb-api-secret-key": "secret-456",
  });
});

Deno.test("api-keys: the probe is the low-scope contacts/count endpoint", () => {
  assertEquals(PROBE_PATH, "/api/v2/contacts/count");
});

Deno.test("api-keys: test passes when the probe answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0 } }]);
  const result = await apiKeys.test({ credential: CRED }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/count");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["sb-api-key-id"], "key-123");
  assertEquals(calls[0].headers["sb-api-secret-key"], "secret-456");
});

Deno.test("api-keys: test fails locally with no credential, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKeys.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The two documented failure shapes are NOT the same, and this is the
 * assertion that keeps them apart: a missing-headers 403 carries no `status`
 * field at all, while a wrong-but-present pair 401s with the ordinary
 * `{"status":"ERROR",...}` shape.
 */
Deno.test("api-keys: a missing-headers 403 is reported as never having reached the request", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { message: "Did not get inputs for authorization" } },
  ]);
  const result = await apiKeys.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/no credential headers/i.test(result.message ?? ""), result.message);
});

Deno.test("api-keys: a wrong-but-present pair is reported as rejected credentials", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { status: "ERROR", message: "Invalid Credentials" } },
  ]);
  const result = await apiKeys.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the api key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-keys: an unrelated failure is reported as an HTTP status, not a credential guess", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKeys.test({ credential: CRED }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});
