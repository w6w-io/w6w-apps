import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { authHeaders, PROBE_PATH, probeCredential, TOKEN_URL } from "./app-auth.ts";

/**
 * Podio **server-side flow** — OAuth 2.0 authorization code.
 *
 * Verified on 2026-08-11 against `developers.podio.com/authentication/server_side`,
 * against Podio's own PHP client, and against live probes.
 *
 * Use this when the workflow should act as a *person*: it reaches everything
 * that person can reach, across every org, workspace and app, where
 * `auth/app-auth.ts` is locked to one app and creates content attributed to the
 * app itself. The cost is that it needs a Podio API key registered against this
 * w6w installation's redirect domain, and that it is a user session — if that
 * person leaves, the Connection dies with them.
 *
 * ## The two settings here that are not defaults, and why
 *
 * **`tokenUrl` is `/oauth/token`, not the documented `/oauth/token/v2`.** The
 * host performs this exchange generically, which means `application/x-www-form-
 * urlencoded` per RFC 6749 §4.1.3 — and `/oauth/token/v2` accepts *only* a JSON
 * body. Posting form-encoded to it answers `400 invalid_value: "Invalid value
 * null (null): must be object"` (measured), which reads like a bad request
 * body rather than a wrong content type and is how this costs an afternoon.
 * The legacy `/oauth/token` is the form-encoded one; it is what Podio's own
 * client uses, and it returns the identical token response. `auth/app-auth.ts`
 * documents all four measured combinations.
 *
 * **`pkce: false`.** Podio's own OAuth page states which specification it
 * implements: "Currently supported is draft-10" — that is
 * `draft-ietf-oauth-v2-10`, from 2010. PKCE (RFC 7636) is from 2015. There is
 * no `code_challenge` support to negotiate, so the spec default of `true` must
 * be turned off rather than left to be silently ignored.
 *
 * ## Scopes
 *
 * Podio's scope grammar is `[scope]:[permission]` pairs separated by spaces —
 * `space:read space:delete` — over five scope types (`global`, `user`, `org`,
 * `space`, `app`) and four permissions (`read`, `write`, `delete`, `all`).
 * Omitting the parameter entirely is documented as equivalent to
 * `global:all`, and that is what an empty `scopes` array produces here.
 *
 * That is deliberate and it is the honest default: which scope a Connection
 * *should* request depends on which of the orgs, workspaces or apps the user
 * intends this workflow to touch, and the user picks those specific references
 * on Podio's own consent screen regardless. Narrowing it here — to, say,
 * `space:all` — would break the app actions and the org actions for everyone,
 * to protect nothing the consent screen does not already gate. What the user
 * actually granted is readable afterwards from `GET /oauth/scope`, which is
 * both this method's `test` probe and the `scope-get` action.
 */

/** Where the browser is sent. Podio's authorize endpoint is on the www host. */
export const AUTHORIZATION_URL = "https://podio.com/oauth/authorize";

/** What this app persists on an OAuth Connection. */
export interface PodioOAuthCredential {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Podio)",
  description:
    "Browser sign-in. Acts as the person who authorises it, across every organization, " +
    "workspace and app they can reach. Requires a Podio API key registered on this w6w " +
    "installation, with its Domain set to this installation's host. For an unattended " +
    "connection scoped to a single app, use App Authentication instead.",
  connectionLabel: "Podio ({{user.mail}})",
  oauth2: {
    authorizationUrl: AUTHORIZATION_URL,
    tokenUrl: TOKEN_URL,
    refreshUrl: TOKEN_URL,
    // Empty is Podio's documented equivalent of `global:all`. See the header.
    scopes: [],
    // Podio implements OAuth2 draft-10, which predates PKCE by five years.
    pkce: false,
  },

  /**
   * The only hook handed the raw credential. `OAuth2`, not `Bearer` — see
   * {@link authHeaders}; the same wire format both methods use, built once.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<PodioOAuthCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred.accessToken))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * The same `/oauth/scope` probe as App Authentication.
   *
   * A user token *could* be probed with `GET /user`, and that would be the
   * obvious choice for this method alone. It is not used, for two reasons: one
   * probe for both methods means one place where an auth failure is classified,
   * and `GET /oauth/scope` answers the question a user-token Connection most
   * often gets wrong — *what did this person actually grant?* — while `/user`
   * only answers that someone is logged in.
   */
  test({ credential }, ctx) {
    const cred = credential as Partial<PodioOAuthCredential>;
    return probeCredential(
      ctx,
      cred?.accessToken,
      "Podio access tokens last 8 hours and refresh tokens 28 days; a connection idle for " +
        "longer than that has to be re-authorised.",
    );
  },

  /**
   * Label the Connection with the person it acts as.
   *
   * `GET /user` returns `{user_id, mail, status, locale, timezone, invites,
   * flags, created_on}` — the login email and nothing secret. It is
   * specifically **not** `GET /user/status`, whose response carries
   * `calendar_code`, the token in the account's iCal feed URL. A label is not
   * worth putting that on the wire for.
   *
   * Only `user_id` and `mail` are kept; the rest is dropped on the floor. A
   * failure is silent — `test` has already established the token is live.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<PodioOAuthCredential>;
    if (!cred?.accessToken) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}/user`, {
        headers: { accept: "application/json", ...authHeaders(cred.accessToken) },
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as
        | { user_id?: number; mail?: string }
        | null;
      if (!body?.mail) return {};
      return { user: { id: body.user_id, mail: body.mail } };
    } catch {
      return {};
    }
  },
};

export { PROBE_PATH };
export default oauth2;
