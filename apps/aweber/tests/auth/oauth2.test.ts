import { assert, assertEquals } from "@std/assert";
import oauth2, { authHeaders, PROBE_PATH } from "../../auth/oauth2.ts";
import { authError, endpointError, entries, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "unitTestFixtureAccessTokenNotReal00000";

Deno.test("oauth2: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.aweber.com/1.0/accounts",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.aweber.com/1.0/accounts");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ accessToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("oauth2: the probe is /accounts", () => {
  assertEquals(PROBE_PATH, "/accounts");
});

Deno.test("oauth2: test passes when /accounts answers", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 123 }]) }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/1.0/accounts");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The RFC 6750 shape — `error` is a bare string — is what an expired or
 * revoked token answers with, and is a different shape than every other
 * error in this API. Distinguishing it is the whole point of this test.
 */
Deno.test("oauth2: an invalid/expired token is reported distinctly (RFC 6750 shape)", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: authError("invalid_token", "The access token is invalid or has expired"),
    },
  ]);
  const result = await oauth2.test({ credential: { accessToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
  assert(/expired or revoked/i.test(result.message ?? ""), result.message);
});

/**
 * A 403 here is documented as ambiguous — missing scope, suspended account,
 * or rate limit, all with the identical `type: "ForbiddenError"`. The probe
 * must not claim more certainty than the vendor's own response carries.
 */
Deno.test("oauth2: a 403 is reported as ambiguous, not as a specific cause", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: endpointError("ForbiddenError", "Rate Limit Error") },
  ]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/403/.test(result.message ?? ""), result.message);
  assert(/scope|suspended|rate limit/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: a 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect publishes the first account's id", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 12345 }]) }]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.0/accounts");
  assertEquals(display, { account: { id: 12345 } });
});

Deno.test("oauth2: afterConnect stays silent when the read fails or is empty", async () => {
  const { ctx: ctxFail } = mockCtx([{ status: 403, body: endpointError("ForbiddenError", "no") }]);
  assertEquals(await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctxFail), {});

  const { ctx: ctxEmpty } = mockCtx([{ body: entries([]) }]);
  assertEquals(await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctxEmpty), {});
});

Deno.test("oauth2: declares the authorization-code flow against auth.aweber.com", () => {
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://auth.aweber.com/oauth2/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://auth.aweber.com/oauth2/token");
  assertEquals(oauth2.oauth2?.revokeUrl, "https://auth.aweber.com/oauth2/revoke");
});
