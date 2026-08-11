import type { HookContext } from "@w6w/types";

/**
 * Everything both Twitch auth methods share: the credential shape, the two
 * headers every Helix request needs, and the three calls to Twitch's
 * authorization service (`id.twitch.tv`).
 *
 * Verified 2026-08-11 against dev.twitch.tv/docs/authentication/ (35,227 bytes)
 * and its sub-pages "Getting OAuth Access Tokens" and "Validating Tokens", plus
 * live probes of `id.twitch.tv`. This module is `auth/`-only on purpose: it is
 * the only place in the app that ever sees a credential.
 *
 * ## Why the credential carries the client id
 *
 * Twitch is the rare API where authentication is TWO values that must agree. A
 * Helix request carries `Authorization: Bearer <access token>` *and* `Client-Id:
 * <client id>`, and the reference's 401 row says what happens when they do not
 * match: "The ID in the Client-Id header must match the client ID in the access
 * token." The `sign` hook is the only code that may stamp either, `sign` runs
 * network-less, and `ctx.connection` is not passed to a `sign` worker — so the
 * client id has to be part of the stored credential. That single fact is why
 * neither method here is `type: "oauth2"`; see `auth/user-access-token.ts`.
 *
 * ## Why the probe is `/oauth2/validate`
 *
 * Twitch ships a purpose-built token-introspection endpoint and *requires*
 * third-party apps to call it hourly ("Twitch periodically conducts audits to
 * discover applications that are not validating access tokens hourly as
 * required"). It is the best probe available, on all four counts that matter:
 *
 *  1. **It needs the credential.** Measured 2026-08-11: no header →
 *     `{"status":401,"message":"missing authorization token"}`; a fake token →
 *     `{"status":401,"message":"invalid access token"}`.
 *  2. **It needs no scope.** Every alternative is a Helix read, and a Helix read
 *     is exactly what a narrowly-scoped user token may legitimately be refused.
 *  3. **It returns nothing secret.** The body is
 *     `{client_id, login, scopes, user_id, expires_in}`. It does not echo the
 *     token, and it never sees the client secret at all — unlike Mailjet's
 *     `/apikey` or Follow Up Boss's `/me`, both banned pack-wide for returning
 *     the caller's own credential.
 *  4. **It answers the question the 401 cannot.** It reports which client id the
 *     token belongs to, which is the one check that catches the mismatch above
 *     *before* a workflow starts failing with an unexplained 401.
 *
 * The `client_id` it returns is not credential material: it is a public
 * identifier that goes out in a header on every single Helix request, and the
 * user supplied it here in the first place. Both `test` hooks compare it rather
 * than displaying it, so nothing is added to the health surface that was not
 * already in the connection form.
 *
 * ## `Authorization: OAuth`, not `Bearer`
 *
 * The validate endpoint's documented header is `Authorization: OAuth <token>`.
 * Twitch notes that `Bearer` is also accepted there, but the documented spelling
 * is used, because this is the one request in the app that does NOT go to Helix
 * and treating it as if it did is how the prefix quietly drifts.
 */

/** Twitch's authorization service. Distinct from the Helix API host. */
export const ID_BASE = "https://id.twitch.tv";

/** Token introspection. See the module header for why this is the probe. */
export const VALIDATE_URL = `${ID_BASE}/oauth2/validate`;

/** Client-credentials and refresh-token grants both post here. */
export const TOKEN_URL = `${ID_BASE}/oauth2/token`;

/**
 * The stored credential.
 *
 * `clientId` is not a secret — it is broadcast in a header on every request —
 * but it is part of the credential because `sign` cannot get it any other way.
 * `clientSecret` and `refreshToken` are absent from an app-token connection
 * that opts out of automatic renewal, which is why both are optional here and
 * why {@link refreshable} exists rather than an assumption.
 */
export interface TwitchCredential {
  clientId: string;
  clientSecret?: string;
  accessToken: string;
  refreshToken?: string;
}

/**
 * The two headers every Helix request needs.
 *
 * Exported and used by both `sign` hooks so there is exactly one definition of
 * the wire format. A hand-rolled second copy is how one method ends up sending
 * a header the other does not.
 */
export function helixAuthHeaders(credential: Partial<TwitchCredential>): Record<string, string> {
  return {
    authorization: `Bearer ${credential.accessToken ?? ""}`,
    "client-id": credential.clientId ?? "",
  };
}

/** Does this credential carry enough to renew itself without the user? */
export function refreshable(credential: Partial<TwitchCredential>): boolean {
  return Boolean(credential.clientId && credential.clientSecret);
}

/** What `GET /oauth2/validate` answers with on success. */
export interface ValidateResult {
  client_id?: string;
  login?: string | null;
  scopes?: string[] | null;
  user_id?: string | null;
  expires_in?: number;
}

/** What it answers with on failure — note there is no `error` key, unlike Helix. */
export interface IdErrorBody {
  status?: number;
  message?: string;
}

export interface ValidateOutcome {
  ok: boolean;
  status: number;
  result?: ValidateResult;
  message?: string;
}

/**
 * Introspect an access token.
 *
 * Never throws: a `test` hook that threw would be indistinguishable from a
 * broken app, and the caller needs the status to tell "token is dead" from
 * "Twitch is down".
 */
export async function validateToken(
  ctx: HookContext,
  accessToken: string,
): Promise<ValidateOutcome> {
  let res: Response;
  try {
    res = await ctx.fetch(VALIDATE_URL, {
      headers: { accept: "application/json", authorization: `OAuth ${accessToken}` },
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: `could not reach id.twitch.tv: ${(err as Error).message}`,
    };
  }
  const body = await res.json().catch(() => null) as (ValidateResult & IdErrorBody) | null;
  if (!res.ok) {
    return { ok: false, status: res.status, message: body?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, status: res.status, result: body ?? {} };
}

/** What a successful grant answers with. `refresh_token` only on the user flows. */
export interface TokenGrant {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string[];
}

/**
 * Post a grant to `id.twitch.tv/oauth2/token`.
 *
 * Both grants this app uses are `application/x-www-form-urlencoded`, per the
 * reference. A failure carries `{"status":400,"message":"invalid client"}` —
 * measured live 2026-08-11 with a bogus client id and secret.
 */
export async function postGrant(
  ctx: HookContext,
  form: Record<string, string>,
): Promise<TokenGrant> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams(form).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    let parsed: IdErrorBody | null = null;
    try {
      parsed = JSON.parse(text) as IdErrorBody;
    } catch { /* keep the raw body */ }
    throw new Error(
      `Twitch token endpoint returned ${res.status}: ${parsed?.message ?? text.slice(0, 300)}`,
    );
  }
  let grant: TokenGrant;
  try {
    grant = JSON.parse(text) as TokenGrant;
  } catch {
    throw new Error("Twitch token endpoint returned a body that is not JSON");
  }
  if (!grant.access_token) {
    throw new Error("Twitch token endpoint returned no access_token");
  }
  return grant;
}
