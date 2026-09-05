import type { AuthDefinition } from "@w6w/types";
import { API_URL, call } from "../lib/client.ts";

/**
 * OAuth 2.0 authorization-code flow — Teamleader Focus's only supported
 * integration auth. Verified against
 * `developer.focus.teamleader.eu/docs/authentication` on 2026-09-01.
 *
 * ## The endpoints are NOT on `api.focus.teamleader.eu`
 *
 * Both the authorize and token endpoints live on `focus.teamleader.eu` (the
 * app itself), one host away from the API host (`api.focus.teamleader.eu`)
 * every Action calls. The doc states both verbatim:
 *
 *   - Authorize: `https://focus.teamleader.eu/oauth2/authorize`
 *   - Token:     `https://focus.teamleader.eu/oauth2/access_token`
 *
 * Getting either host wrong is the classic Teamleader integration bug — the
 * API host answers `401`/`404` for both.
 *
 * ## No `scope` parameter in the flow
 *
 * Unlike most OAuth2 vendors, Teamleader does not accept a `scope` query
 * parameter on `/oauth2/authorize` at all — the doc's parameter list is only
 * `client_id`, `response_type`, `state`, `redirect_uri`. Scopes are instead
 * fixed once, per integration, when the integration is registered on the
 * Teamleader Marketplace ("it is required to select all scopes your
 * integration wants access to"). There is nothing this Auth method can put in
 * `oauth2.scopes` that the authorize request would actually send, so the
 * field is deliberately omitted rather than populated with a guessed list —
 * an app owner sets the real scopes once, in the Marketplace, when they
 * register the OAuth client this App's server-side config points at.
 *
 * ## Registration requires the Marketplace
 *
 * A `client_id`/`client_secret` pair only exists after registering an
 * integration at `https://marketplace.focus.teamleader.eu/build`; there is no
 * self-serve API-key alternative for third-party integrations (unlike, say,
 * Apify). That registration is a w6w-server-side OAuth client config, not
 * anything this App package can do the outside world.
 *
 * ## Token lifetime
 *
 * Access tokens last ~1 hour; refresh tokens are single-use and rotate on
 * every refresh (Teamleader issues a new refresh token alongside the new
 * access token). The runtime's built-in `refresh` handler already does the
 * standard `grant_type=refresh_token` POST to `tokenUrl` and stores whatever
 * token pair comes back, so no custom `refresh` hook is declared here — same
 * as this pack's other rotating-refresh-token OAuth2 apps.
 */
export const AUTHORIZE_URL = "https://focus.teamleader.eu/oauth2/authorize";
export const TOKEN_URL = "https://focus.teamleader.eu/oauth2/access_token";

export interface TeamleaderCredential {
  accessToken: string;
}

interface UsersMeResponse {
  id?: string;
  account?: { id?: string; type?: string };
  first_name?: string;
  last_name?: string;
  email?: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Teamleader)",
  description:
    "Authorize a Teamleader Focus account. Requires an OAuth 2.0 integration registered on the " +
    "Teamleader Marketplace (client_id / client_secret / redirect_uri) configured on this w6w " +
    "installation — the integration's granted scopes are fixed there, not chosen per Connection.",
  connectionLabel: "{{first_name}} {{last_name}} ({{account_id}})",
  oauth2: {
    authorizationUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    // No `scopes`: Teamleader's /oauth2/authorize takes no `scope` parameter.
    // See the file-level comment for why this is deliberate, not an omission.
    pkce: true,
  },

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. Every Action call — regardless of
   * which `<resource>.<action>` RPC method it targets — authenticates the
   * same way, on `api.focus.teamleader.eu`.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<TeamleaderCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `users.me` — "Get the current authenticated user" — is the probe.
   *
   * It requires a live token (unauthenticated or expired/revoked tokens are
   * refused), and its response is entirely account-metadata: the user's id,
   * name, email, language, time zone and team memberships. None of that is
   * a credential — it is the RPC-API analogue of a whoami, and Teamleader's
   * own docs point new integrators at this exact endpoint to "retrieve
   * information about the user who authorized your application". There is no
   * narrower unauthenticated ping to prefer instead: every Teamleader RPC
   * method requires a token.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as Partial<TeamleaderCredential>;
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}/users.me`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: "{}",
    });

    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message: "Teamleader rejected the access token (401) — it may be expired or revoked.",
      };
    }
    if (res.status === 403) {
      return { ok: false, message: "Teamleader refused users.me for this token (403)." };
    }
    return { ok: false, message: `Teamleader returned HTTP ${res.status} for users.me` };
  },

  /**
   * Publish the user's name and account id for the connection label. Reuses
   * `users.me`, the same call `test` just proved is live and credential-free
   * in its response.
   *
   * Deliberately silent on failure: `test` has already established the token
   * works, and a missing display label must not fail an otherwise-good
   * Connection.
   */
  async afterConnect(_input, ctx) {
    try {
      const me = await call<UsersMeResponse>(ctx, "users.me");
      if (!me?.id) return {};
      return {
        first_name: me.first_name ?? "",
        last_name: me.last_name ?? "",
        account_id: me.account?.id ?? "",
        email: me.email,
      };
    } catch {
      return {};
    }
  },
};

export default oauth2;
