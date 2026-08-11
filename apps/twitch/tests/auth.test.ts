import { assert, assertEquals, assertRejects } from "@std/assert";
import appAccessToken from "../auth/app-access-token.ts";
import userAccessToken from "../auth/user-access-token.ts";
import { helixAuthHeaders, refreshable } from "../auth/shared.ts";
import { idError, mockCtx, pathOf } from "./_helpers.ts";

const APP_CRED = { clientId: "cid1", clientSecret: "sec1", accessToken: "app-token" };
const USER_CRED = {
  clientId: "cid1",
  clientSecret: "sec1",
  accessToken: "user-token",
  refreshToken: "refresh-1",
};

/** The validate response for an APP token: login and user_id are null. */
const APP_VALIDATE = {
  client_id: "cid1",
  login: null,
  scopes: [],
  user_id: null,
  expires_in: 5011271,
};
/** ...and for a USER token: both populated. */
const USER_VALIDATE = {
  client_id: "cid1",
  login: "twitchdev",
  scopes: ["moderator:read:followers"],
  user_id: "141981764",
  expires_in: 14124,
};

// --- sign -------------------------------------------------------------------

/**
 * The whole reason both methods exist in this shape: Twitch needs TWO headers
 * and they must agree. A `sign` that stamps only the bearer produces a 401 on
 * every single request.
 */
Deno.test("sign: both methods stamp Authorization AND Client-Id", () => {
  for (const method of [appAccessToken, userAccessToken]) {
    const signed = method.sign!(
      {
        request: { url: "https://api.twitch.tv/helix/users", method: "GET", headers: {} },
        credential: USER_CRED,
      },
      mockCtx().ctx,
    ) as { headers: Record<string, string> };

    assertEquals(signed.headers["authorization"], "Bearer user-token", method.key);
    assertEquals(signed.headers["client-id"], "cid1", method.key);
  }
});

Deno.test("sign: the header builder is shared, so the two methods cannot drift", () => {
  assertEquals(helixAuthHeaders({ clientId: "c", accessToken: "t" }), {
    authorization: "Bearer t",
    "client-id": "c",
  });
});

/** `sign` is network-less by contract — it must never reach for ctx.fetch. */
Deno.test("sign: makes no network call", () => {
  const { ctx, calls } = mockCtx([]);
  appAccessToken.sign!(
    {
      request: { url: "https://api.twitch.tv/helix/users", method: "GET", headers: {} },
      credential: APP_CRED,
    },
    ctx,
  );
  assertEquals(calls.length, 0);
});

// --- test: the probe ---------------------------------------------------------

Deno.test("test: probes id.twitch.tv/oauth2/validate with the OAuth prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: APP_VALIDATE }]);
  const out = await appAccessToken.test({ credential: APP_CRED }, ctx);

  assertEquals(new URL(calls[0].url).hostname, "id.twitch.tv");
  assertEquals(pathOf(calls[0].url), "/oauth2/validate");
  // Twitch's documented header for this endpoint is `OAuth`, not `Bearer`.
  assertEquals(calls[0].headers["authorization"], "OAuth app-token");
  assertEquals(out, { ok: true });
});

/**
 * The probe must not echo the credential back into the health surface. The
 * validate body carries no token and no secret — this pins that, so a future
 * "let's include more detail" change has to argue with a test.
 */
Deno.test("test: no message ever contains the token or the client secret", async () => {
  const cases: Array<[typeof appAccessToken, unknown, Record<string, unknown>]> = [
    [appAccessToken, APP_CRED, { status: 401, body: idError(401, "invalid access token") }],
    [appAccessToken, APP_CRED, { body: USER_VALIDATE }],
    [userAccessToken, USER_CRED, { status: 401, body: idError(401, "invalid access token") }],
    [userAccessToken, USER_CRED, { body: APP_VALIDATE }],
    [userAccessToken, USER_CRED, { body: { ...USER_VALIDATE, client_id: "other" } }],
    [userAccessToken, USER_CRED, { body: { ...USER_VALIDATE, scopes: [] } }],
  ];
  assertEquals(cases.length, 6, "expected 6 probe outcomes to inspect");

  for (const [method, credential, response] of cases) {
    const { ctx } = mockCtx([response]);
    const result = await method.test({ credential }, ctx);
    const message = result.message ?? "";
    for (const secret of ["app-token", "user-token", "sec1", "refresh-1"]) {
      assert(!message.includes(secret), `${method.key} leaked ${secret}: ${message}`);
    }
  }
});

// --- test: kind and client-id assertions -------------------------------------

/**
 * The mismatch Twitch only rejects per-request. Catching it at connect time is
 * the difference between one clear message and every action 401ing forever.
 */
Deno.test("test: a token minted for a different client is rejected by both methods", async () => {
  const app = mockCtx([{ body: { ...APP_VALIDATE, client_id: "someone-else" } }]);
  const appOut = await appAccessToken.test({ credential: APP_CRED }, app.ctx);
  assertEquals(appOut.ok, false);
  assert(appOut.message!.includes("different Twitch application"), appOut.message);

  const user = mockCtx([{ body: { ...USER_VALIDATE, client_id: "someone-else" } }]);
  const userOut = await userAccessToken.test({ credential: USER_CRED }, user.ctx);
  assertEquals(userOut.ok, false);
  assert(userOut.message!.includes("different Twitch application"), userOut.message);
});

/** `user_id: null` is Twitch's documented discriminator between the two kinds. */
Deno.test("test: each method refuses the other's token kind", async () => {
  const appGivenUser = mockCtx([{ body: USER_VALIDATE }]);
  const a = await appAccessToken.test({ credential: APP_CRED }, appGivenUser.ctx);
  assertEquals(a.ok, false);
  assert(a.message!.includes("USER access token"), a.message);

  const userGivenApp = mockCtx([{ body: APP_VALIDATE }]);
  const u = await userAccessToken.test({ credential: USER_CRED }, userGivenApp.ctx);
  assertEquals(u.ok, false);
  assert(u.message!.includes("APP access token"), u.message);
});

Deno.test("test: a 401 from the validate endpoint fails with Twitch's own wording", async () => {
  const { ctx } = mockCtx([{ status: 401, body: idError(401, "invalid access token") }]);
  const out = await appAccessToken.test({ credential: APP_CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("invalid access token"), out.message);
});

Deno.test("test: a missing field fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await appAccessToken.test({ credential: {} }, ctx)).ok, false);
  assertEquals((await userAccessToken.test({ credential: { accessToken: "t" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** A scope-less user token is legitimate — it just reaches less. */
Deno.test("test: a user token with no scopes passes, with a note", async () => {
  const { ctx } = mockCtx([{ body: { ...USER_VALIDATE, scopes: [] } }]);
  const out = await userAccessToken.test({ credential: USER_CRED }, ctx);
  assertEquals(out.ok, true);
  assert(out.message!.includes("no scopes"), out.message);
});

Deno.test("test: a user token's scopes are reported so a missing one is visible", async () => {
  const { ctx } = mockCtx([{ body: USER_VALIDATE }]);
  const out = await userAccessToken.test({ credential: USER_CRED }, ctx);
  assertEquals(out, { ok: true, message: "scopes: moderator:read:followers" });
});

// --- afterConnect ------------------------------------------------------------

Deno.test("afterConnect: the app method labels by a client-id prefix and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await appAccessToken.afterConnect!({ credential: APP_CRED }, ctx);
  assertEquals(out, { clientIdPrefix: "cid1" });
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: the user method publishes login, id and scopes — and nothing else", async () => {
  const { ctx } = mockCtx([{ body: USER_VALIDATE }]);
  const out = await userAccessToken.afterConnect!({ credential: USER_CRED }, ctx);
  assertEquals(out, {
    login: "twitchdev",
    userId: "141981764",
    scopes: ["moderator:read:followers"],
  });
});

Deno.test("afterConnect: a failure is silent rather than breaking a good connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: idError(500, "boom") }]);
  assertEquals(await userAccessToken.afterConnect!({ credential: USER_CRED }, ctx), {});
});

// --- refresh -----------------------------------------------------------------

Deno.test("refresh: the app method re-mints with grant_type=client_credentials", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "app-token-2", expires_in: 5011271 } }]);
  const out = await appAccessToken.refresh!({ credential: APP_CRED }, ctx) as {
    accessToken: string;
    clientId: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/oauth2/token");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "client_credentials");
  assertEquals(form.get("client_id"), "cid1");
  assertEquals(form.get("client_secret"), "sec1");
  assertEquals(out.accessToken, "app-token-2");
  assertEquals(out.clientId, "cid1", "the client id must survive a refresh, or sign breaks");
});

/**
 * Twitch ROTATES the refresh token on every exchange and invalidates the old
 * one. Keeping the original is how a refresh loop works exactly once.
 */
Deno.test("refresh: the user method stores the NEW refresh token", async () => {
  const { ctx, calls } = mockCtx([{
    body: { access_token: "user-token-2", refresh_token: "refresh-2", expires_in: 14124 },
  }]);
  const out = await userAccessToken.refresh!({ credential: USER_CRED }, ctx) as {
    accessToken: string;
    refreshToken: string;
    clientId: string;
  };

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "refresh_token");
  assertEquals(form.get("refresh_token"), "refresh-1");
  assertEquals(out.accessToken, "user-token-2");
  assertEquals(out.refreshToken, "refresh-2");
  assertEquals(out.clientId, "cid1");
});

Deno.test("refresh: keeps the old refresh token when Twitch returns none", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "user-token-2" } }]);
  const out = await userAccessToken.refresh!({ credential: USER_CRED }, ctx) as {
    refreshToken: string;
  };
  assertEquals(out.refreshToken, "refresh-1");
});

Deno.test("refresh: a token-endpoint failure surfaces Twitch's message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: idError(400, "invalid client") }]);
  const err = await assertRejects(
    () => Promise.resolve(appAccessToken.refresh!({ credential: APP_CRED }, ctx)),
    Error,
  );
  assert(err.message.includes("invalid client"), err.message);
});

Deno.test("refresh: refuses without the material it needs, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(appAccessToken.refresh!({ credential: { accessToken: "t" } }, ctx)),
    Error,
    "cannot renew",
  );
  await assertRejects(
    () => Promise.resolve(userAccessToken.refresh!({ credential: APP_CRED }, ctx)),
    Error,
    "cannot renew",
  );
  assertEquals(calls.length, 0);
  assertEquals(refreshable({ clientId: "c" }), false);
  assertEquals(refreshable({ clientId: "c", clientSecret: "s" }), true);
});
