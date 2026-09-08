import type { AuthDefinition } from "@w6w/types";
import { formatYelpError, PARTNER_API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 Authorization Code — the only auth surface the Leads API
 * documents. There is no API-key path: every Leads endpoint's OpenAPI
 * document declares `security: [{ oauth2: ["leads"] }]`, and the
 * `bearerAuth`/`basic` schemes it also lists under `components.securitySchemes`
 * belong to *other* Yelp APIs (Fusion) that share the same doc template —
 * they are never referenced by a Leads `security` requirement, so this app
 * does not offer them.
 *
 * Verified against `docs.developer.yelp.com/docs/authorization-code-workflow`
 * and `docs.developer.yelp.com/docs/refresh-tokens` (both fetched 2026-09-06),
 * cross-checked against the OpenAPI `securitySchemes.oauth2` block embedded
 * in every Leads reference page:
 *
 *   - Authorization: `GET https://biz.yelp.com/oauth2/authorize` — a
 *     *different* host from the API host, the business user's browser login.
 *   - Token exchange / refresh: `POST https://api.yelp.com/oauth2/token/v3`
 *     (form-encoded `client_id`, `client_secret`, and either
 *     `grant_type=authorization_code&code=...` or
 *     `grant_type=refresh_token&refresh_token=...`).
 *   - Scope: `leads` — "Access Yelp Leads on your behalf, including reading
 *     and responding to messages, and storing message data." It is the only
 *     scope this app requests; `r2r`/`r2r_get_businesses`/`r2r_business_owner`
 *     belong to Yelp's separate Respond-to-Review surface.
 *   - Revocation: `POST https://api.yelp.com/oauth2/revoke` — confirmed via
 *     the reference page's own rendered `data-testid="serverurl"`, which
 *     resolves the OpenAPI's relative `/revoke` path against the real host.
 *
 * ## Token/refresh-token lifetimes (why `refreshUrl` matters here)
 *
 * Authorization codes expire in 5 minutes, access tokens in 7 days, refresh
 * tokens in 365 days ("Token Lifetimes", authorization-code-workflow doc).
 * The v3 token endpoint issues a **new** refresh token on every refresh (v2,
 * `/oauth2/token`, does not — it re-returns the same one) and revokes the
 * prior refresh token if an expired one is presented — both documented on
 * `docs/refresh-tokens`. `refreshUrl` points at the same v3 endpoint as
 * `tokenUrl`, differentiated only by `grant_type`, exactly as Yelp's own
 * sample request shows.
 *
 * ## No whoami — the probe is a token-scoped business list, not a Lead read
 *
 * Every Leads endpoint proper needs a Lead ID or a Business ID that cannot be
 * discovered from the token alone, so none of them can be a zero-input health
 * probe. `partner-api.yelp.com/token/v1/businesses` — "Get Businesses
 * Associated with Access Token" — takes only the `Authorization` header and
 * answers `{"business_ids": [...]}` (verified against that page's own
 * OpenAPI document, `servers: ["https://partner-api.yelp.com/"]`). It needs
 * no path/query parameter, so it works for a freshly-authorized connection
 * before the caller knows any Lead or Business ID, and its response is a list
 * of the *caller's own* business ids — not a credential, not a secret,
 * unlike Mailjet's `/apikey` or Follow Up Boss's `/me`.
 */

export interface YelpOAuthCredential {
  accessToken?: string;
  refreshToken?: string;
}

/** The one place the wire format is built, so `sign` and `test` cannot drift apart. */
export function bearerHeader(credential: Partial<YelpOAuthCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.accessToken ?? ""}` };
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Yelp)",
  description:
    "Business-user OAuth flow. Requires access to the Yelp Leads API, which Yelp restricts to " +
    "advertising and listing-management reseller partners meeting a minimum spend requirement " +
    "— see docs.developer.yelp.com/docs/leads-api. Also requires a Yelp app registration " +
    "(client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "Yelp Leads ({{businessCount}} business(es))",

  oauth2: {
    authorizationUrl: "https://biz.yelp.com/oauth2/authorize",
    tokenUrl: "https://api.yelp.com/oauth2/token/v3",
    refreshUrl: "https://api.yelp.com/oauth2/token/v3",
    revokeUrl: "https://api.yelp.com/oauth2/revoke",
    scopes: ["leads"],
    // Docusign/Slack-style confidential server flow — Yelp's authorization-code
    // doc describes `client_id`/`client_secret`/`redirect_uri` with no mention
    // of a code_challenge parameter anywhere in the workflow or token docs.
    pkce: false,
  },

  sign({ request, credential }) {
    const cred = credential as Partial<YelpOAuthCredential>;
    for (const [name, value] of Object.entries(bearerHeader(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module doc for why `/token/v1/businesses` and not a Lead read. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<YelpOAuthCredential>;
    const accessToken = (cred?.accessToken ?? "").trim();
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${PARTNER_API_URL}/token/v1/businesses`, {
      headers: { accept: "application/json", ...bearerHeader({ accessToken }) },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;

    if (!res.ok) {
      return {
        ok: false,
        message: `Yelp rejected the token: ${formatYelpError(res.status, body)}`,
      };
    }
    return { ok: true };
  },

  /**
   * Publish how many businesses this token reaches, for the connection label
   * — nothing else. The endpoint returns only an array of business ids
   * (no name, no credential material), so there is nothing else worth
   * keeping and nothing to redact.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<YelpOAuthCredential>;
    const accessToken = (cred?.accessToken ?? "").trim();
    if (!accessToken) return {};

    try {
      const res = await ctx.fetch(`${PARTNER_API_URL}/token/v1/businesses`, {
        headers: { accept: "application/json", ...bearerHeader({ accessToken }) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { business_ids?: string[] };
      return { businessCount: body.business_ids?.length ?? 0 };
    } catch {
      return {};
    }
  },
};

export default oauth2;
