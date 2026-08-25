import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeader } from "../../auth/api-key.ts";
import { invalidKeyBody, mockCtx, noAuthBody, pathOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealApiKey00000";

Deno.test("api-key: sign stamps HTTP Basic with the key as username, no password", () => {
  const request = {
    method: "GET",
    url: "https://api.streak.com/api/v1/pipelines",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Basic ${btoa(`${KEY}:`)}`);
});

Deno.test("api-key: authHeader is the single source of the wire format", () => {
  assertEquals(authHeader(KEY), `Basic ${btoa(`${KEY}:`)}`);
  // The trailing colon (empty password) is load-bearing — Streak's own guide
  // requires no password, and this is how "no password" is expressed in Basic auth.
  assert(authHeader(KEY).includes(btoa(`${KEY}:`)));
});

Deno.test("api-key: test passes when /users/me answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "tesla@streak.com" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v1/users/me");
  assertEquals(calls[0].headers.authorization, `Basic ${btoa(`${KEY}:`)}`);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Streak's two documented 401 shapes are two different problems: no
 * credential reached the request, versus a credential that was rejected.
 * Collapsing them into one generic "unauthorized" would misreport a
 * connection whose key just needs replacing as one that was never wired up.
 */
Deno.test("api-key: an invalid key is reported as rejected, quoting Streak's own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: invalidKeyBody() }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected the api key/i.test(result.message ?? ""), result.message);
  assert(/invalid api key/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a missing credential is reported as never having arrived", async () => {
  const { ctx } = mockCtx([{ status: 401, body: noAuthBody() }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/received no credential/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect publishes only the email", async () => {
  const { ctx, calls } = mockCtx([
    { body: { email: "tesla@streak.com", userKey: "u1", displayName: "tesla@streak.com" } },
  ]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/users/me");
  assertEquals(display, { email: "tesla@streak.com" });
});

Deno.test("api-key: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: noAuthBody() }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: afterConnect stays silent with no credential, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await apiKey.afterConnect!({ credential: {} }, ctx), {});
  assertEquals(calls.length, 0);
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "basic");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
