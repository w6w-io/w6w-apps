import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH, WHY_NOT_USER } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const CREDENTIAL = { apiKey: "sk_test_key_0123456789" };

Deno.test("auth: sign stamps xi-api-key and nothing else", () => {
  const request = {
    url: "https://api.elevenlabs.io/v1/models",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: CREDENTIAL } as never,
    {} as never,
  ) as typeof request;
  assertEquals(signed.headers["xi-api-key"], CREDENTIAL.apiKey);
  // Not a bearer scheme: the vendor documents the header form only.
  assertEquals(signed.headers.authorization, undefined);
  // And the key never reaches the URL, where a host would log it.
  assert(!signed.url.includes(CREDENTIAL.apiKey));
});

Deno.test("auth: sign and test build the header the same way", () => {
  assertEquals(authHeaders(CREDENTIAL), { "xi-api-key": CREDENTIAL.apiKey });
  assertEquals(authHeaders({}), { "xi-api-key": "" });
});

Deno.test("auth: the probe is the subscription read, not the whoami", async () => {
  const { ctx, calls } = mockCtx([{ body: { tier: "creator" } }]);
  assertEquals(await apiKey.test({ credential: CREDENTIAL } as never, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/user/subscription");
  assertEquals(PROBE_PATH, "/v1/user/subscription");
  assertEquals(calls[0].headers["xi-api-key"], CREDENTIAL.apiKey);
  assertStringIncludes(WHY_NOT_USER, "xi_api_key");
});

Deno.test("auth: a missing credential fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * THE finding. ElevenLabs' own error table documents `authentication_error` as
 * HTTP 401, but a request carrying a *wrong* key answers **400** — measured
 * live on 2026-08-11 against this exact path. A `res.status === 401` test would
 * report a mistyped key as a generic bad request.
 */
Deno.test("auth: a 400 invalid_api_key is reported as a rejected key, not a bad request", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: errorBody("authentication_error", "invalid_api_key", "API key is invalid.", {
        param: "api_key",
      }),
    },
  ]);
  const result = await apiKey.test({ credential: CREDENTIAL } as never, ctx);
  assertEquals(result.ok, false);
  assertStringIncludes(result.message!, "rejected the key");
  assertStringIncludes(result.message!, "invalid_api_key");
  // The two ways a working key silently stops working, named where the user reads them.
  assertStringIncludes(result.message!, "expired");
  assertStringIncludes(result.message!, "secret-scanning");
});

Deno.test("auth: a 401 with no key at all is also reported as a rejected key", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        "authentication_error",
        "unauthorized",
        "Neither authorization header nor xi-api-key received, please provide one.",
      ),
    },
  ]);
  const result = await apiKey.test({ credential: CREDENTIAL } as never, ctx);
  assertEquals(result.ok, false);
  assertStringIncludes(result.message!, "rejected the key");
});

/**
 * A scoped key is a supported configuration, so "live but not allowed here" is a
 * different message from "wrong key" — conflating them sends the user to rotate
 * a perfectly good credential.
 */
Deno.test("auth: a 403 is reported as scoped-away, not as an invalid key", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("authorization_error", "missing_permissions", "Nope.") },
  ]);
  const result = await apiKey.test({ credential: CREDENTIAL } as never, ctx);
  assertEquals(result.ok, false);
  assertStringIncludes(result.message!, "live but");
  assertStringIncludes(result.message!, "scoped away");
  assertStringIncludes(result.message!, "IP allowlist");
});

Deno.test("auth: a 429 says to retry rather than blaming the credential", async () => {
  const { ctx } = mockCtx([
    { status: 429, body: errorBody("rate_limit_error", "rate_limit_exceeded", "Slow down.") },
  ]);
  const result = await apiKey.test({ credential: CREDENTIAL } as never, ctx);
  assertEquals(result.ok, false);
  assertStringIncludes(result.message!, "rate-limited");
});

Deno.test("auth: an unexpected status falls through with the path named", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "gateway" }]);
  const result = await apiKey.test({ credential: CREDENTIAL } as never, ctx);
  assertEquals(result.ok, false);
  assertStringIncludes(result.message!, "/v1/user/subscription");
});

Deno.test("auth: afterConnect publishes the tier and never calls the whoami", async () => {
  const { ctx, calls } = mockCtx([{ body: { tier: "creator", status: "active", foo: "bar" } }]);
  const label = await apiKey.afterConnect!({ credential: CREDENTIAL } as never, ctx);
  assertEquals(label, { tier: "creator", status: "active" });
  assertEquals(pathOf(calls[0].url), "/v1/user/subscription");
  assertEquals(calls.length, 1);
});

Deno.test("auth: afterConnect fails silently — a label must not fail a good connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals(await apiKey.afterConnect!({ credential: CREDENTIAL } as never, ctx), {});
});
