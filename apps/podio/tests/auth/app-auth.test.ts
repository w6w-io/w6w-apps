import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import appAuth, {
  authHeaders,
  describeScope,
  PROBE_PATH,
  TOKEN_URL,
  WHY_NOT_USER_STATUS,
} from "../../auth/app-auth.ts";
import type { SignableRequest } from "@w6w/types";
import {
  BAD_TOKEN_401,
  bodyOf,
  errorBody,
  formOf,
  mockCtx,
  NO_CREDENTIAL_401,
  pathOf,
} from "../_helpers.ts";

const CRED = {
  clientId: "client-id",
  clientSecret: "client-secret",
  appId: "654321",
  appToken: "app-token",
  accessToken: "live-access-token",
  refreshToken: "live-refresh-token",
};

/** The token response Podio's own documentation shows for the app grant. */
const TOKEN_RESPONSE = {
  access_token: "new-access-token",
  token_type: "bearer",
  expires_in: 28800,
  refresh_token: "new-refresh-token",
  ref: { type: "app", id: 654321 },
};

// --- configuration -----------------------------------------------------------

Deno.test("app-auth: declares every credential field as a secret except the app id", () => {
  assertEquals(appAuth.key, "app-auth");
  assertEquals(appAuth.type, "custom");
  const byKey = Object.fromEntries((appAuth.fields ?? []).map((f) => [f.key, f]));
  for (const key of ["clientId", "clientSecret", "appToken"]) {
    assertEquals(byKey[key].type, "secret", `${key} is not type "secret"`);
    assertEquals(byKey[key].required, true);
  }
  // The app id is an identifier, not a credential; masking it would make the
  // connection unreadable for no gain.
  assertEquals(byKey.appId.type, "string");
});

/**
 * Podio's `/oauth/token/v2` accepts only a JSON body and this app posts
 * form-encoded, so pointing at it would fail with "must be object" — an error
 * that reads like bad credentials. Pinning the URL makes a change deliberate.
 */
Deno.test("app-auth: the token endpoint is the form-encoded one, not the JSON-only /v2", () => {
  assertEquals(TOKEN_URL, "https://api.podio.com/oauth/token");
  assert(!TOKEN_URL.endsWith("/v2"), "pointed at the JSON-only endpoint while posting a form");
});

Deno.test("app-auth: the probe is /oauth/scope, and the whoami is rejected with a reason", () => {
  assertEquals(PROBE_PATH, "/oauth/scope");
  assert(WHY_NOT_USER_STATUS.includes("calendar_code"));
  assert(WHY_NOT_USER_STATUS.includes("App Authentication"));
});

// --- sign --------------------------------------------------------------------

Deno.test("app-auth sign: stamps the OAuth2 scheme Podio documents, not Bearer", () => {
  const request: SignableRequest = {
    url: "https://api.podio.com/item/1",
    method: "GET",
    headers: {},
  };
  const signed = appAuth.sign!({ request, credential: CRED }, mockCtx().ctx) as SignableRequest;
  assertEquals(signed.headers.authorization, "OAuth2 live-access-token");
  assert(
    !signed.headers.authorization.startsWith("Bearer"),
    "used Bearer — Podio documents `Authorization: OAuth2 ACCESS_TOKEN`",
  );
});

Deno.test("app-auth sign: never puts the token in the URL", () => {
  const request: SignableRequest = {
    url: "https://api.podio.com/item/1",
    method: "GET",
    headers: {},
  };
  const signed = appAuth.sign!({ request, credential: CRED }, mockCtx().ctx) as SignableRequest;
  assertEquals(signed.url, "https://api.podio.com/item/1");
  assert(
    !signed.url.includes("oauth_token"),
    "the token reached the URL, where logs would keep it",
  );
});

Deno.test("authHeaders: one place builds the wire format, and it tolerates an absent token", () => {
  assertEquals(authHeaders("abc"), { authorization: "OAuth2 abc" });
  assertEquals(authHeaders(undefined), { authorization: "OAuth2 " });
});

// --- exchange ----------------------------------------------------------------

Deno.test("app-auth exchange: posts the app grant form-encoded, without a redirect_uri", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN_RESPONSE }]);
  const credential = await appAuth.exchange!({
    fields: {
      clientId: "client-id",
      clientSecret: "client-secret",
      appId: "654321",
      appToken: "app-token",
    },
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, TOKEN_URL);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(formOf(calls[0]), {
    grant_type: "app",
    app_id: "654321",
    app_token: "app-token",
    client_id: "client-id",
    client_secret: "client-secret",
  });
  // The prose lists redirect_uri; the vendor's own client omits it for this
  // grant, and a redirect URI is meaningless for a flow with no redirect.
  assertEquals(formOf(calls[0]).redirect_uri, undefined);

  assertEquals(credential.accessToken, "new-access-token");
  assertEquals(credential.refreshToken, "new-refresh-token");
  assertEquals(credential.appId, "654321");
  assert(typeof credential.expiresAt === "string");
});

Deno.test("app-auth exchange: refuses to call Podio with an incomplete form", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(appAuth.exchange!({ fields: { clientId: "a" } }, ctx)),
    Error,
    "are all required",
  );
  assertEquals(calls.length, 0, "made a network call with an incomplete credential");
});

Deno.test("app-auth exchange: surfaces Podio's OAuth error without echoing the request", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error: "invalid_client",
      error_detail: "oauth.client.invalid_id",
      error_description: "Sorry, you've supplied an invalid client id.",
    },
  }]);
  const error = await assertRejects(
    () =>
      Promise.resolve(appAuth.exchange!({
        fields: {
          clientId: "wrong",
          clientSecret: "secret-value",
          appId: "1",
          appToken: "token-value",
        },
      }, ctx)),
    Error,
  );
  assert(error.message.includes("invalid_client"));
  assert(error.message.includes("invalid client id"));
  assert(!error.message.includes("secret-value"), "the client secret leaked into the error");
  assert(!error.message.includes("token-value"), "the app token leaked into the error");
});

Deno.test("app-auth exchange: a 200 with no access_token is still a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { token_type: "bearer" } }]);
  await assertRejects(
    () =>
      Promise.resolve(appAuth.exchange!({
        fields: { clientId: "a", clientSecret: "b", appId: "1", appToken: "t" },
      }, ctx)),
    Error,
    "Podio token request failed",
  );
});

// --- refresh -----------------------------------------------------------------

Deno.test("app-auth refresh: tries the refresh grant first", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN_RESPONSE }]);
  const out = await appAuth.refresh!({ credential: CRED }, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(formOf(calls[0]).grant_type, "refresh_token");
  assertEquals(formOf(calls[0]).refresh_token, "live-refresh-token");
  // Podio's refresh grant needs the client pair too — omitting it 400s.
  assertEquals(formOf(calls[0]).client_id, "client-id");
  assertEquals(formOf(calls[0]).client_secret, "client-secret");
  assertEquals(out.accessToken, "new-access-token");
});

/**
 * A Podio refresh token dies after 28 days and also whenever the app token is
 * regenerated. Re-minting from the four stored values is what keeps the
 * Connection alive instead of failing it.
 */
Deno.test("app-auth refresh: falls back to a fresh app grant when the refresh token is dead", async () => {
  const { ctx, calls } = mockCtx([
    { status: 400, body: { error: "invalid_grant", error_description: "refresh token expired" } },
    { body: TOKEN_RESPONSE },
  ]);
  const out = await appAuth.refresh!({ credential: CRED }, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 2);
  assertEquals(formOf(calls[0]).grant_type, "refresh_token");
  assertEquals(formOf(calls[1]).grant_type, "app");
  assertEquals(formOf(calls[1]).app_token, "app-token");
  assertEquals(out.accessToken, "new-access-token");
});

Deno.test("app-auth refresh: goes straight to the app grant with no refresh token stored", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN_RESPONSE }]);
  await appAuth.refresh!({ credential: { ...CRED, refreshToken: undefined } }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(formOf(calls[0]).grant_type, "app");
});

Deno.test("app-auth refresh: keeps the old refresh token when a response omits one", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "a", expires_in: 100 } }]);
  const out = await appAuth.refresh!({ credential: CRED }, ctx) as Record<string, unknown>;
  assertEquals(
    out.refreshToken,
    "live-refresh-token",
    "a response without a refresh token stripped the connection's ability to refresh",
  );
});

Deno.test("app-auth refresh: a credential missing its originating values fails loudly", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(appAuth.refresh!({ credential: { accessToken: "a" } }, ctx)),
    Error,
    "missing its originating app values",
  );
  assertEquals(calls.length, 0);
});

// --- test --------------------------------------------------------------------

Deno.test("app-auth test: probes /oauth/scope with the OAuth2 scheme", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ ref_type: "app", ref_id: 654321 }] }]);
  assertEquals(await appAuth.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/oauth/scope");
  assertEquals(calls[0].headers.authorization, "OAuth2 live-access-token");
});

Deno.test("app-auth test: no access token short-circuits without a call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await appAuth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("no access token"));
  assertEquals(calls.length, 0);
});

/**
 * The whole reason `classifyAuthFailure` reads the body: these two responses
 * share a status AND an `error` code, and mean opposite things.
 */
Deno.test("app-auth test: the missing-credential 401 says reconnect, not refresh", async () => {
  const { ctx } = mockCtx([{ status: 401, body: NO_CREDENTIAL_401 }]);
  const out = await appAuth.test({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("received no credential"));
  assert(out.message!.includes("reconnect"));
});

Deno.test("app-auth test: the rejected-token 401 warns that expired_token does not mean expired", async () => {
  const { ctx } = mockCtx([{ status: 401, body: BAD_TOKEN_401 }]);
  const out = await appAuth.test({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("rejected the token"));
  assert(
    out.message!.includes("revoked or never-valid"),
    "did not warn that Podio reports expired_token for a token that never worked",
  );
  assert(out.message!.includes("App Token"), "the method-specific hint was lost");
});

Deno.test("app-auth test: 403 is reported as a permission problem, not an auth failure", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "no_access", "/oauth/scope"),
  }]);
  const out = await appAuth.test({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("refused"));
  assert(out.message!.includes("authenticated but is not permitted"));
});

Deno.test("app-auth test: a 5xx is reported as Podio's problem, with the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await appAuth.test({ credential: CRED }, ctx);
  assertEquals(out, { ok: false, message: "Podio returned HTTP 503 for /oauth/scope" });
});

// --- afterConnect ------------------------------------------------------------

Deno.test("app-auth afterConnect: labels from the scope read and never fetches the app", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{
      ref_type: "app",
      ref_id: 654321,
      permissions: ["read", "write"],
      ref_data: { name: "Leads" },
    }],
  }]);
  const label = await appAuth.afterConnect!({ credential: CRED }, ctx) as Record<string, unknown>;
  assertEquals(label.app, { id: "654321" });
  assertEquals(label.scope, { summary: "Leads (read/write)" });
  assertEquals(calls.length, 1);
  assertEquals(
    pathOf(calls[0].url),
    "/oauth/scope",
    "fetched something other than the scope — GET /app/{id} would return the app token",
  );
});

Deno.test("app-auth afterConnect: a failed or thrown label read still yields a usable label", async () => {
  const failing = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await appAuth.afterConnect!({ credential: CRED }, failing.ctx),
    { app: { id: "654321" }, scope: { summary: "scope unknown" } },
  );

  const throwing = mockCtx([]);
  assertEquals(
    await appAuth.afterConnect!({ credential: CRED }, throwing.ctx),
    { app: { id: "654321" }, scope: { summary: "scope unknown" } },
  );
});

Deno.test("describeScope: names the grant, falls back to type+id, and caps the list", () => {
  assertEquals(describeScope(null), "no scope reported");
  assertEquals(describeScope([]), "no scope reported");
  assertEquals(
    describeScope([{ ref_type: null, ref_id: null, permissions: ["all"] }]),
    "global (all)",
  );
  assertEquals(
    describeScope([{ ref_type: "space", ref_id: 42, permissions: ["read"] }]),
    "space 42 (read)",
  );
  assertEquals(
    describeScope([{ ref_type: "app", ref_id: 1, ref_data: { config: { name: "Leads" } } }]),
    "Leads",
  );
  const many = describeScope(
    [1, 2, 3, 4, 5].map((id) => ({ ref_type: "app", ref_id: id, permissions: ["read"] })),
  );
  assert(many.endsWith("+2 more"), many);
});

// --- the body of the exchange never carries the credential onward ------------

/**
 * The mirror-image trap, asserted from the other side: posting JSON to
 * `/oauth/token` answers `invalid_client: "Missing parameter client_id"`
 * (measured), which reads like wrong credentials. The body must be a form.
 */
Deno.test("app-auth: the token request body is a form, never JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN_RESPONSE }]);
  await appAuth.exchange!({
    fields: { clientId: "a", clientSecret: "b", appId: "1", appToken: "t" },
  }, ctx);
  assertThrows(
    () => bodyOf(calls[0]),
    SyntaxError,
    undefined,
    "the body parsed as JSON — Podio's /oauth/token accepts only a form",
  );
  assertEquals(formOf(calls[0]).client_id, "a");
});
