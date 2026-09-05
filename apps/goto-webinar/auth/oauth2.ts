import type { AuthDefinition } from "@w6w/types";
import { IDENTITY_URL, OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — GoTo's own OAuth provider, shared across every GoTo product
 * (Webinar, Meeting, Training, Connect, …), not something Webinar-specific.
 *
 * Verified 2026-09-05 against the vendor's own `Authentication.postman_collection.json`
 * (embedded in `developer.goto.com`'s page data for `/Authentication/`) plus the
 * `guides/Authentication/03_HOW_accessToken` walkthrough page and live probes:
 *
 *   - Authorize URL: `https://authentication.logmeininc.com/oauth/authorize`
 *     (`response_type`, `client_id`, `redirect_uri`, optional `scope`/`state`).
 *   - Token URL: `https://authentication.logmeininc.com/oauth/token` — confirmed live: an
 *     unauthenticated POST answers `401 {"error":"invalid_client","error_description":
 *     "client not found"}` with `WWW-Authenticate: Basic`, i.e. the token endpoint expects
 *     the client credentials as HTTP Basic auth (`base64(client_id:client_secret)`), exactly
 *     as the walkthrough's cURL example shows — NOT a `client_secret` body field.
 *   - **No PKCE.** The token exchange is `client_id` + `code` + `redirect_uri` with the
 *     client authenticated via Basic auth; no `code_verifier` appears anywhere in the
 *     documented request. `pkce: false` (the spec's default is `true`).
 *   - **No documented scope string for GoToWebinar specifically.** The Webinar API's own
 *     collection says only "`collab:` must be used when a token is requested from the
 *     Authentication API" with no worked example, and the authorize-endpoint's own `scope`
 *     parameter doc says: "If no scope are specified, your access token will receive all
 *     scopes assigned to your client ID." Rather than guess a scope string that could
 *     silently narrow the token away from Webinar, no `scopes` are declared here — the
 *     account's OAuth client (created in GoTo's developer console with GoToWebinar as one of
 *     its products) is what actually grants access, not a scope string typed here.
 *   - `refresh_token` IS present in the response (`expires_in: 3600`), so `refreshUrl` is the
 *     same token endpoint (GoTo's token endpoint doubles for both grant types, per the
 *     walkthrough's "Exchange your authorization code or refresh token" collection item).
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with GoTo)",
  description:
    "Public OAuth flow. Requires a GoTo OAuth client (registered at developer.goto.com) with " +
    "GoToWebinar enabled as a product, configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: OAUTH_AUTHORIZE_URL,
    tokenUrl: OAUTH_TOKEN_URL,
    refreshUrl: OAUTH_TOKEN_URL,
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * Probe: `GET /identity/v1/Users/me` — GoTo's shared whoami (SCIM-flavored "Get Current
   * User"), the narrowest-scope endpoint that still requires a live credential. It needs no
   * product-specific scope, unlike any Webinar-resource path (which all additionally require
   * an `organizerKey` this hook does not yet have — that is resolved in `afterConnect` below).
   *
   * **Quirk, verified live 2026-09-05**: on failure this endpoint answers with an EMPTY body
   * (`content-length: 0`) regardless of whether the token is missing or garbage — both cases
   * were probed directly. The only classification signal is the RFC 6750 `WWW-Authenticate`
   * challenge header (`error="invalid_token",error_description="..."`), so that is what is
   * parsed here; a bare `res.ok` / `res.status` check alone would not distinguish "no token
   * reached the API" from "the request tripped a WAF", and the vendor gives no body to tell
   * them apart. This is the one endpoint in this app where the classification source is
   * necessarily a header rather than a JSON body, because the vendor sends no body at all.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${IDENTITY_URL}/Users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.ok) return { ok: true };

    // Prefer a JSON body if the vendor ever sends one here; fall back to the
    // WWW-Authenticate challenge, since a live probe showed the body is empty on failure.
    const raw = await res.text().catch(() => "");
    let detail: string | undefined;
    if (raw) {
      try {
        const body = JSON.parse(raw) as { detail?: string; msg?: string; int_err_code?: string };
        detail = body.detail ?? body.msg ?? body.int_err_code;
      } catch {
        detail = raw.slice(0, 300);
      }
    }
    if (!detail) {
      const challenge = res.headers.get("www-authenticate") ?? "";
      const code = challenge.match(/error="([^"]+)"/)?.[1];
      const description = challenge.match(/error_description="([^"]+)"/)?.[1];
      detail = code ? `${code}${description ? `: ${description}` : ""}` : undefined;
    }
    return {
      ok: false,
      message: detail
        ? `GoTo rejected the token (${detail})`
        : `GoTo returned HTTP ${res.status} for identity/v1/Users/me`,
    };
  },

  /**
   * Publish the account's name/email for `connectionLabel`, and record `organizerKey` — the
   * SCIM user's `id` field, which the collection's own top-level note says IS the
   * organizerKey ("Note: Both userKey and organizerKey used in the APIs contain the same
   * value"). Every Webinar action in this app needs `organizerKey`; capturing it once here
   * means a workflow author never has to go look it up by hand.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    const res = await ctx.fetch(`${IDENTITY_URL}/Users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      id?: string;
      userName?: string;
      displayName?: string;
      name?: { givenName?: string; familyName?: string };
    };
    if (!body.id) return {};
    return {
      organizerKey: body.id,
      user: {
        name: body.displayName ?? body.name?.givenName,
        email: body.userName,
      },
    };
  },
};

export default oauth2;
