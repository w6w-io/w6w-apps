import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * OAuth 2.0 — the only credential this app implements.
 *
 * ## Two protocols, one choice
 *
 * Tumblr's API v2 reference documents THREE authentication levels per method:
 * `None`, `API key` (the OAuth consumer key sent as a plain `api_key` query
 * parameter — no signing) and `OAuth`, which the doc's "Authentication"
 * section defines as "a signed request that meets the OAuth 1.0a Protocol".
 * Reading only that line would suggest OAuth 1.0a — HMAC-SHA1 request
 * signing, a temporary-credentials dance, `oauth_nonce`/`oauth_timestamp` on
 * every call — is the only way to reach an `OAuth`-level method.
 *
 * It is not. The same page's later "OAuth2 Authorization" section documents a
 * complete, fully current OAuth 2.0 implementation: Authorization Code grant
 * (with PKCE-compatible client support), Client Credentials, and Refresh
 * Token, at `/oauth2/authorize` + `/v2/oauth2/token`, presenting a plain
 * `Authorization: Bearer {access_token}` header — and the vendor's own worked
 * example sends that exact bearer header to `GET /v2/user/info`, an
 * `OAuth`-level method. So OAuth 2.0 is not a partial or second-class path:
 * it reaches the same methods OAuth 1.0a does, without ever touching
 * request-signing code. This app implements OAuth 2.0 only, and never
 * reimplements OAuth 1.0a's HMAC-SHA1 signing.
 *
 * ## Scopes
 *
 * `basic` (read the connected account and its blogs), `write` (create, edit,
 * delete, like, follow — everything this app's `perform` actions need) and
 * `offline_access` (required to receive a `refresh_token` at all — omit it
 * and the access token cannot be renewed once it expires). All three are
 * requested by default so every action here works without a second consent
 * step.
 */

export interface TumblrCredential {
  accessToken: string;
}

/** The one place the wire format is built, shared with `test`. */
export function authHeaders(credential: Partial<TumblrCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

/**
 * `GET /v2/user/info` — the vendor's own OAuth2 walkthrough ends here ("this
 * curl request will retrieve the user's account information"). It needs only
 * the `basic` scope (the narrowest this app requests), is not scoped to any
 * one blog or resource, and its response — `following` count, `blogs[]` (name,
 * url, title, follower count) — carries no credential material, unlike some
 * vendors' equivalent "whoami" endpoint.
 */
export const PROBE_PATH = "/user/info";

/**
 * Classify a failed response the way {@link PROBE_PATH} actually answers —
 * verified live on 2026-09-05, not assumed from the doc's schema alone.
 *
 * **`errors[0].detail`'s wording is randomised for a generic/no-credential
 * failure.** Three consecutive unauthenticated calls to `/v2/user/info`
 * returned three different sentences ("Hit a glitch. Try again.", "Internet
 * strangeness. Try again.", "Measly little error. Try again."), all under
 * `code: 0`. A syntactically-plausible but wrong bearer token, by contrast,
 * consistently answers `code: 1013, detail: "Unable to authorize"`. So this
 * function branches on the numeric `code` — the one field Tumblr keeps
 * stable — never on `detail`'s prose.
 */
export function classifyAuthFailure(
  status: number,
  body: { errors?: Array<{ code?: number; detail?: string }> } | null,
): string {
  const err = body?.errors?.[0];
  if (err?.code === 1013) {
    return "Tumblr rejected the access token (code 1013, unable to authorize). It may be " +
      "expired or revoked — reconnect this connection.";
  }
  if (status === 401) {
    return "Tumblr returned 401 Unauthorized. The credential likely did not reach the request " +
      "— reconnect this connection.";
  }
  if (status === 403) {
    return `Tumblr refused the account read (403${err?.detail ? `: ${err.detail}` : ""}). This ` +
      "can mean a missing basic scope or a suspended/flagged account.";
  }
  return `Tumblr returned HTTP ${status} for ${PROBE_PATH}${err?.detail ? `: ${err.detail}` : ""}`;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Tumblr)",
  description: "Connect a Tumblr account. Requires an app registered at " +
    "tumblr.com/oauth/apps on this w6w installation.",
  connectionLabel: "Tumblr ({{name}})",
  oauth2: {
    authorizationUrl: "https://www.tumblr.com/oauth2/authorize",
    tokenUrl: "https://api.tumblr.com/v2/oauth2/token",
    refreshUrl: "https://api.tumblr.com/v2/oauth2/token",
    scopes: ["basic", "write", "offline_access"],
    scopeSeparator: " ",
    pkce: true,
  },

  /** The only hook handed the raw credential. Runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<TumblrCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} and {@link classifyAuthFailure} for why this endpoint and this logic. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TumblrCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { errors?: Array<{ code?: number; detail?: string }> }
      | null;
    return { ok: false, message: classifyAuthFailure(res.status, body) };
  },

  /**
   * Publish the account's own short name, since a Connection list that all
   * reads "Tumblr" is unusable.
   *
   * Silent on failure: `test` already established the token works, and a
   * missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TumblrCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { response?: { user?: { name?: string } } };
      const name = body?.response?.user?.name;
      return name ? { name } : {};
    } catch {
      return {};
    }
  },
};

export default oauth2;
