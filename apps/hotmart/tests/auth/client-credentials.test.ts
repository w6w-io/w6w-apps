import { assertEquals, assertRejects } from "@std/assert";
import clientCredentials, {
  describeTokenFailure,
  requestAccessToken,
} from "../../auth/client-credentials.ts";
import { mockCtx, pathOf, queryOf, TOKEN_URL } from "../_helpers.ts";

const FIELDS = { clientId: "cid", clientSecret: "csecret", basicToken: "YmFzaWM=" };

function tokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "wxyz",
    token_type: "bearer",
    expires_in: 172799,
    scope: "read write",
    jti: "da2eff63-754d-4v76-9b3a-19bdb5cc8f36",
    ...overrides,
  };
}

Deno.test("requestAccessToken - sends client_id/client_secret as query and the Basic token as a header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: tokenResponse() }]);
  const result = await requestAccessToken(
    ctx,
    FIELDS.clientId,
    FIELDS.clientSecret,
    FIELDS.basicToken,
  );
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url.startsWith(TOKEN_URL), true);
  assertEquals(pathOf(calls[0].url), "/security/oauth/token");
  assertEquals(queryOf(calls[0].url), {
    grant_type: "client_credentials",
    client_id: "cid",
    client_secret: "csecret",
  });
  assertEquals(calls[0].headers["authorization"], `Basic ${FIELDS.basicToken}`);
});

Deno.test("requestAccessToken - a non-2xx is reported as not-ok with the raw body", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { error: "unauthorized", error_description: "Full authentication is required" },
    },
  ]);
  const result = await requestAccessToken(ctx, "bad", "bad", "bad");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 401);
    assertEquals(result.raw.includes("unauthorized"), true);
  }
});

Deno.test("requestAccessToken - a 200 with no access_token is treated as not-ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { scope: "read" } }]);
  const result = await requestAccessToken(ctx, "a", "b", "c");
  assertEquals(result.ok, false);
});

Deno.test("describeTokenFailure - surfaces the vendor error code", () => {
  const msg = describeTokenFailure(
    401,
    JSON.stringify({ error: "unauthorized", error_description: "x" }),
  );
  assertEquals(msg.includes("unauthorized"), true);
});

Deno.test("exchange - turns the three fields into a credential carrying a fresh access token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: tokenResponse() }]);
  const before = Date.now();
  const credential = await clientCredentials.exchange!({ fields: FIELDS }, ctx) as {
    clientId: string;
    clientSecret: string;
    basicToken: string;
    accessToken?: string;
    expiresAt?: number;
  };
  assertEquals(credential.clientId, FIELDS.clientId);
  assertEquals(credential.clientSecret, FIELDS.clientSecret);
  assertEquals(credential.basicToken, FIELDS.basicToken);
  assertEquals(credential.accessToken, "wxyz");
  assertEquals(typeof credential.expiresAt, "number");
  assertEquals(credential.expiresAt! >= before + 172799 * 1000, true);
});

Deno.test("exchange - throws when a required field is missing", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(clientCredentials.exchange!({ fields: { clientId: "x" } }, ctx)),
    Error,
    "required",
  );
});

Deno.test("exchange - throws a formatted error when Hotmart rejects the credentials", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "unauthorized", error_description: "bad" },
  }]);
  await assertRejects(
    () => Promise.resolve(clientCredentials.exchange!({ fields: FIELDS }, ctx)),
    Error,
  );
});

Deno.test("test - re-runs the exchange and reports ok on success", async () => {
  const { ctx } = mockCtx([{ status: 200, body: tokenResponse() }]);
  const result = await clientCredentials.test({ credential: FIELDS }, ctx);
  assertEquals(result, { ok: true });
});

Deno.test("test - reports a clear message on a rejected credential", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: "unauthorized", error_description: "bad creds" } },
  ]);
  const result = await clientCredentials.test({ credential: FIELDS }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Client ID/Secret/Basic token"), true);
});

Deno.test("test - reports missing fields without making a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await clientCredentials.test({ credential: { clientId: "only" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("sign - injects the access token as a Bearer header and makes no network call", () => {
  const request = {
    url: "https://developers.hotmart.com/user/api/v1/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = clientCredentials.sign!(
    { request, credential: { ...FIELDS, accessToken: "tok123" } },
    mockCtx([]).ctx,
  );
  assertEquals((out as typeof request).headers["authorization"], "Bearer tok123");
});

Deno.test("refresh - re-exchanges using the stored secrets and returns a fresh credential", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: tokenResponse({ access_token: "new-token" }),
  }]);
  const credential = { ...FIELDS, accessToken: "stale" };
  const out = await clientCredentials.refresh!({ credential }, ctx) as { accessToken?: string };
  assertEquals(out.accessToken, "new-token");
  assertEquals(calls.length, 1);
});

Deno.test("afterConnect - publishes name/email and nothing else", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { name: "Maria Silva", email: "maria@example.com", phone: "999" } },
  ]);
  const out = await clientCredentials.afterConnect!({
    credential: { ...FIELDS, accessToken: "tok" },
  }, ctx);
  assertEquals(out, { name: "Maria Silva", email: "maria@example.com" });
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("afterConnect - fails silently (empty object) when the profile read errors", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await clientCredentials.afterConnect!({
    credential: { ...FIELDS, accessToken: "tok" },
  }, ctx);
  assertEquals(out, {});
});

Deno.test("afterConnect - returns nothing when there is no access token yet", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await clientCredentials.afterConnect!({ credential: FIELDS }, ctx);
  assertEquals(out, {});
  assertEquals(calls.length, 0);
});
