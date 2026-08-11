import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL } from "../lib/client.ts";
import { classifyProbe, PROBE_PATH } from "./probe.ts";

/**
 * Raindrop OAuth 2.0 — the multi-user path.
 *
 * Register an application at raindrop.io > Settings > Integrations, configure
 * its redirect URL, and store the resulting `client_id` + `client_secret` on
 * this w6w installation; end users then connect through the browser flow.
 *
 * Everything below was read off `developer.raindrop.io/v1/authentication/token`
 * and measured against the live endpoints on 2026-08-11.
 *
 * ## The endpoints are not where the prose says they are
 *
 * The reference's prose gives `https://raindrop.io/oauth/authorize` and
 * `https://raindrop.io/oauth/access_token`; its own cURL example gives
 * `https://api.raindrop.io/v1/oauth/authorize`. Both are right, because the
 * first pair `307`-redirects to the second:
 *
 *     $ curl -sI "https://raindrop.io/oauth/access_token" -X POST
 *     HTTP/2 307
 *     location: https://api.raindrop.io/v1/oauth/access_token
 *
 * This method declares the **final** URLs. A `307` does preserve the method and
 * body, so the redirect is survivable in principle — but a token `POST` that
 * carries a client secret should not depend on every HTTP client in the path
 * getting redirect semantics right, and an `Authorization`-bearing hop across
 * hosts is exactly where clients drop headers. Note the path is `/v1/oauth/…`,
 * **not** `/rest/v1/oauth/…`: the OAuth routes sit outside the REST prefix that
 * every other path in this app uses.
 *
 * ## No scopes, no PKCE
 *
 * The authorization request takes `client_id`, `redirect_uri` and
 * `response_type=code` — the reference documents no `scope` parameter, no
 * `code_challenge`, and no consent granularity of any kind. A Raindrop access
 * token is all-or-nothing over the user's account. So `scopes` is omitted rather
 * than invented, and `pkce` is `false`: offering a challenge the vendor never
 * documented would, at best, be ignored.
 *
 * ## The token exchange, and the one thing that will bite an integrator
 *
 * `POST` to the token URL with `grant_type=authorization_code`, `code`,
 * `client_id`, `client_secret` and the same `redirect_uri`. The reference shows
 * a JSON body; the endpoint was measured accepting **both** JSON and
 * `application/x-www-form-urlencoded` (identical response bodies), so the host's
 * standard form-encoded exchange helper works unmodified.
 *
 * **A failed exchange comes back as HTTP 200.** Measured, verbatim:
 *
 *     $ curl -s -o /dev/null -w '%{http_code}' -X POST \
 *         https://api.raindrop.io/v1/oauth/access_token \
 *         -H 'Content-Type: application/json' -d '{…bogus client…}'
 *     200
 *     {"result":false,"status":400,"errorMessage":"client_id or client_secret is invalid"}
 *
 * The REST API returns a real `401` for a bad credential; the OAuth surface does
 * not, and reports its status inside the body instead. Anything that decides
 * "did the exchange work?" from `res.ok` will store a credential that was never
 * issued, and the user will see a connection that looks healthy and fails on
 * first use. The exchange itself is the host's, so this app cannot fix that
 * there — what it can do is make sure the failure surfaces immediately, which is
 * what `test` below does: a credential with no `access_token` is reported as
 * broken before any Action runs, and the message names this exact cause.
 *
 * ## Two-week expiry is real
 *
 * "For security reasons access tokens (except 'test tokens') will expire after
 * two weeks." The refresh is `POST` to the same URL with
 * `grant_type=refresh_token`, `refresh_token`, `client_id` and `client_secret`.
 * That call needs the *application's* secret, which an App never holds — the
 * host does — so `refreshUrl` is declared and no `refresh` hook is implemented
 * here: a hook that had to invent a client secret would be worse than absent.
 * Read `expires_in` (seconds), not the deprecated `expires` (milliseconds).
 */

export interface OAuthCredential {
  accessToken: string;
  refreshToken?: string;
}

/** The one place the wire format is built — see `auth/test-token.ts` for why. */
export function authHeaders(credential: Partial<OAuthCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Raindrop.io)",
  description:
    "Browser sign-in for any Raindrop.io account. Requires a Raindrop application registration " +
    "(client ID, client secret and redirect URL) configured on this w6w installation. Access " +
    "tokens expire after two weeks and are refreshed automatically.",
  connectionLabel: "Raindrop.io ({{fullName}})",
  oauth2: {
    authorizationUrl: OAUTH_AUTHORIZE_URL,
    tokenUrl: OAUTH_TOKEN_URL,
    refreshUrl: OAUTH_TOKEN_URL,
    // Raindrop documents no `scope` parameter and no PKCE support. See above.
    pkce: false,
  },

  /** Network-less, credential-only: stamp the bearer header and return. */
  sign({ request, credential }) {
    const cred = credential as Partial<OAuthCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * See `auth/probe.ts` for the endpoint and the body-based classification.
   *
   * The empty-credential branch is doing real work here, not defensive
   * boilerplate: Raindrop's token endpoint reports a failed exchange as HTTP 200
   * with `{"result": false}`, so "the exchange silently produced nothing" is a
   * shape this method genuinely has to expect, and the message says so.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<OAuthCredential>;
    const token = (cred?.accessToken ?? "").trim();
    if (!token) {
      return {
        ok: false,
        message: "credential carries no access_token. Raindrop's token endpoint answers HTTP 200 " +
          "even when an exchange fails (the failure is in the body), so an authorization that " +
          "went wrong can leave an empty credential behind. Reconnect this connection.",
      };
    }

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ accessToken: token }) },
    });
    const body = await res.json().catch(() => null);
    return classifyProbe(res.status, body, "access token");
  },

  /**
   * Publish the account's display name only — see `auth/test-token.ts` for why
   * `email`, `config` and `groups` are dropped rather than passed through, and
   * why a failure here is silent.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<OAuthCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/user`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { user?: { fullName?: string; _id?: number } };
      const fullName = body?.user?.fullName;
      const userId = body?.user?._id;
      if (!fullName) return {};
      return userId ? { fullName, userId } : { fullName };
    } catch {
      return {};
    }
  },
};

export default oauth2;
