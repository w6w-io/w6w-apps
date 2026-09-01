import type { AuthDefinition } from "@w6w/types";
import { API_BASE, USER_AGENT } from "../lib/client.ts";

/**
 * OAuth 2.0 — the vendor's *only* authentication method, and specifically its
 * "Multi-User Application" flow (Authorization Code grant), which the
 * reference itself calls "the preferred method of integration with Sell".
 *
 * Verified against `developer.zendesk.com/api-reference/sales-crm/authentication/*`
 * (Introduction, Requests, Reference — fetched 2026-09-01) plus a live probe of
 * `api.getbase.com`.
 *
 * ## Endpoints, all on the API host, none on a `zendesk.com` host
 *
 *  - `GET  /oauth2/authorize` — authorization endpoint (code or implicit grant).
 *  - `POST /oauth2/token`     — token endpoint (exchange code, password grant, refresh).
 *  - `POST /oauth2/revoke`    — token revocation.
 *  - `GET  /oauth2/token/info` — token validation (not used here).
 *
 * Because these live on `api.getbase.com` — the same host already in
 * `w6w.network.allow` — nothing extra needs declaring; the runtime allows OAuth
 * endpoint hosts implicitly anyway.
 *
 * ## Client auth is Basic, on the token endpoint, always
 *
 * "Every request to the OAuth token endpoint requires client authentication...
 * use the standard Authorization header with the basic authentication scheme,
 * where the username is the client_id and the password is the client_secret."
 * That is the runtime's own default client-authentication behaviour for
 * `oauth2`, so nothing custom is declared for it either.
 *
 * ## No PKCE
 *
 * The reference documents four flows (Authorization Code, Implicit, Resource
 * Owner Password Credentials, Refresh Token) and never mentions a
 * `code_challenge` / PKCE parameter anywhere in the Authorization Request or
 * Token Request tables. `pkce: false` reflects the documented surface exactly,
 * not a guess.
 *
 * ## Scopes
 *
 * Exactly three, space-delimited: `read` (everything except account/user info),
 * `write` (everything except account/user info), `profile` (account and user
 * info ONLY — read-only). Requesting all three is what makes the CRUD actions
 * in this app *and* the `GET /v2/users/self` probe below reachable by the one
 * connection this app creates; there is no narrower scope that covers both.
 *
 * ## Access token lifetime
 *
 * A token minted via this flow expires in exactly one hour
 * (`"expires_in": 3600`); `refreshUrl` (same as `tokenUrl`, per the vendor's own
 * "Refreshing an Access Token" section, which reuses `/oauth2/token` with
 * `grant_type=refresh_token`) lets the host renew it silently. No custom
 * `refresh` hook is needed: the standard `refresh_token` grant is exactly what
 * the runtime's default refresh does against `refreshUrl`.
 */
/** `/v2/users/self` — see the `test` hook below for why this and not `/v2/accounts/self`. */
export const PROBE_PATH = "/v2/users/self";

interface SellUser {
  id: number;
  name: string;
  email?: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Zendesk Sell)",
  description:
    "Sell's own OAuth 2.0 Authorization Code flow — the vendor's recommended integration path. " +
    "Requires a Sell OAuth application (Settings > API & Integrations) registered with a matching " +
    "redirect URI, configured on this w6w installation.",
  connectionLabel: "{{name}} ({{email}})",
  oauth2: {
    authorizationUrl: `${API_BASE}/oauth2/authorize`,
    tokenUrl: `${API_BASE}/oauth2/token`,
    refreshUrl: `${API_BASE}/oauth2/token`,
    revokeUrl: `${API_BASE}/oauth2/revoke`,
    scopes: ["read", "write", "profile"],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v2/users/self` — "Returns a single authenticating user, according to
   * the authentication credentials provided." Chosen over the also-documented
   * `GET /v2/accounts/self` because it needs no id, answers with the connected
   * user's own identity (useful for {@link SellUser.name} in the connection
   * label) and, per the JSON format table on the Users resource page, returns
   * no credential material of any kind — unlike some vendors' whoami endpoints.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
        authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "Zendesk Sell rejected the access token (401) — it may be expired, revoked, or never " +
          "reached the request. Reconnect this connection.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          "Zendesk Sell refused the request (403) — the token's granted scopes may not include " +
          '"profile", which GET /v2/users/self requires.',
      };
    }
    return { ok: false, message: `Zendesk Sell returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
          authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) return {};
      const body = await res.json() as { data?: SellUser };
      const user = body?.data;
      if (!user?.name) return {};
      return { name: user.name, email: user.email };
    } catch {
      return {};
    }
  },
};

export default oauth2;
