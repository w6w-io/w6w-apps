import { assert, assertEquals, assertRejects } from "@std/assert";
import auth from "../../auth/oauth-client-credentials.ts";
import { basicPayload } from "../../auth/token.ts";
import { AUTH_TOKEN_URL, errorBody, mockCtx } from "../_helpers.ts";

const HOOK_CTX = mockCtx().ctx;

function tokenResponse(accessToken = "JWT") {
  return { body: { token_type: "Bearer", access_token: accessToken, expires_in: 3600 } };
}

Deno.test("oauth: declares the machine-to-machine shape, not the browser one", () => {
  assertEquals(auth.key, "oauth-client-credentials");
  // `oauth2` in this spec models the authorization-code redirect; this grant has
  // no browser round trip, which is what keeps it working in scheduled runs.
  assertEquals(auth.type, "custom");
  assertEquals(auth.oauth2, undefined);
});

Deno.test("oauth: both halves of the credential are secret fields", () => {
  const byKey = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(byKey.clientId.type, "secret");
  assertEquals(byKey.clientSecret.type, "secret");
  assertEquals(byKey.clientId.required, true);
  assertEquals(byKey.clientSecret.required, true);
});

/**
 * Every v3 GET is served only to a Site Admin subject, so a `sub` pointing at
 * anyone else silently empties every read in the app. The field has to say so
 * where someone filling the form will see it.
 */
Deno.test("oauth: the sub field warns that list endpoints need a Site Admin", () => {
  const sub = (auth.fields ?? []).find((f) => f.key === "sub");
  assert(sub?.hint?.includes("Site Admin"), sub?.hint);
});

Deno.test("oauth exchange: mints a token and keeps the client pair for later refreshes", async () => {
  const { ctx, calls } = mockCtx([tokenResponse()]);
  const credential = await auth.exchange!(
    { fields: { clientId: "cid-4", clientSecret: "sec", sub: "42" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, AUTH_TOKEN_URL);
  assertEquals(credential.accessToken, "JWT");
  assertEquals(credential.clientId, "cid-4");
  assertEquals(credential.clientSecret, "sec");
  assert(typeof credential.expiresAt === "string");
});

Deno.test("oauth exchange: refuses a half-filled form before spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(auth.exchange!({ fields: { clientId: "cid-4" } }, ctx)),
    Error,
    "Client ID and Client Secret",
  );
  assertEquals(calls.length, 0);
});

/**
 * The client-credentials grant issues no refresh token, so renewal is the same
 * exchange again — which is only possible because the pair is kept in the stored
 * credential.
 */
Deno.test("oauth refresh: re-runs the exchange from the stored client pair", async () => {
  const { ctx, calls } = mockCtx([tokenResponse("JWT2")]);
  const credential = await auth.refresh!(
    { credential: { clientId: "cid-4", clientSecret: "sec", accessToken: "OLD" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].headers.authorization, `Basic ${basicPayload("cid-4", "sec")}`);
  assertEquals(credential.accessToken, "JWT2");
});

Deno.test("oauth sign: stamps the minted token and touches nothing else", () => {
  const request = { url: "https://harvest.greenhouse.io/v3/jobs", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { accessToken: "JWT" } }, HOOK_CTX) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], "Bearer JWT");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
});

Deno.test("oauth test: a mint plus a clean probe is a pass", async () => {
  const { ctx, calls } = mockCtx([tokenResponse(), { body: [{ id: 1 }] }]);
  assertEquals(
    await auth.test({ credential: { clientId: "cid-4", clientSecret: "sec" } }, ctx),
    { ok: true },
  );
  assertEquals(calls.length, 2);
  assertEquals(calls[1].headers.authorization, "Bearer JWT");
});

Deno.test("oauth test: a scoped-away credential passes with an explanation", async () => {
  const { ctx } = mockCtx([tokenResponse(), { status: 403, body: errorBody("Forbidden") }]);
  const result = await auth.test({ credential: { clientId: "c-4", clientSecret: "s" } }, ctx);
  assertEquals(result.ok, true);
  assert(result.message?.includes("Credential is live"), result.message);
});

/**
 * The reason `scrub` exists: Greenhouse quotes the client id back in this exact
 * message, and a `test` result is persisted into the health surface.
 */
Deno.test("oauth test: a rejection never echoes the credential back", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "client_id=leakme-4 does not contain a valid client ID suffix" },
  }]);
  const result = await auth.test(
    { credential: { clientId: "leakme-4", clientSecret: "topsecret" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(!result.message?.includes("leakme-4"), result.message);
  assert(!result.message?.includes("topsecret"), result.message);
});

Deno.test("oauth test: an empty credential fails without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
