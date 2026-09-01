import type { AuthDefinition } from "@w6w/types";

const IDENTITY_URL = "https://api.freshbooks.com/auth/api/v1/users/me";

interface FreshBooksBusinessMembership {
  id?: number;
  role?: string;
  business?: { id?: number; name?: string; account_id?: string };
}

interface FreshBooksIdentity {
  response?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    business_memberships?: FreshBooksBusinessMembership[];
  };
}

/**
 * OAuth 2.0 with a FreshBooks app.
 *
 * Endpoints below are verified directly against freshbooks.com/api/authentication
 * (the "Authorization URL" section and the curl examples in the code pane):
 *
 *   - Authorize: `https://auth.freshbooks.com/oauth/authorize/`
 *   - Token exchange / refresh: `https://api.freshbooks.com/auth/oauth/token`
 *     (same URL, `grant_type` distinguishes `authorization_code` from
 *     `refresh_token`)
 *   - Revoke: `https://api.freshbooks.com/auth/oauth/revoke`
 *
 * `pkce: false` — FreshBooks' own token-exchange examples pass only
 * `client_id`, `client_secret`, `code`/`refresh_token` and `redirect_uri`;
 * nothing in the reference mentions a `code_challenge`/`code_verifier`, so
 * this app does not assert support it hasn't confirmed (same reasoning as
 * this pack's QuickBooks app).
 *
 * FreshBooks' own token-endpoint examples show a **JSON** request body
 * (`--data-raw '{ "grant_type": ... }'`), not the
 * `application/x-www-form-urlencoded` body RFC 6749 (and this host's
 * `oauth-flow.ts`) sends. Most OAuth2 token endpoints accept both per spec,
 * but this is unverified against FreshBooks without live credentials — flag
 * if the exchange fails in practice.
 *
 * **Two ids, two API domains, neither on the token.** FreshBooks scopes its
 * `accounting` endpoints (clients, invoices, expenses) to a legacy
 * `accountId`, and its `timetracking`/`projects` endpoints to a newer
 * `businessId` — see `lib/client.ts`'s doc comment. Both are discovered by
 * `afterConnect` from `GET /auth/api/v1/users/me` (the "Identity Info"
 * endpoint documented on freshbooks.com/api/identity_model) and recorded on
 * the connection's `display` for actions to read via `ctx.connection`.
 *
 * Only the FIRST business membership is used — preferring one with role
 * `owner` (FreshBooks' own docs: "Most users have accounts... but not all",
 * e.g. a Client-role membership may have no account of its own) — the same
 * "one Connection, one tenant" choice this pack's Xero and Jira apps make: a
 * token whose identity spans several businesses needs one Connection per
 * business.
 *
 * `ctx.fetch` is unsigned for every auth-phase hook other than `sign` itself
 * (Hook Runtime RFC sandbox posture table), so both `test` and `afterConnect`
 * below set the `Authorization` header by hand.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with FreshBooks)",
  description: "Public OAuth flow. Requires a FreshBooks app registered on this w6w installation.",
  connectionLabel: "{{businessName}}",
  oauth2: {
    authorizationUrl: "https://auth.freshbooks.com/oauth/authorize/",
    tokenUrl: "https://api.freshbooks.com/auth/oauth/token",
    refreshUrl: "https://api.freshbooks.com/auth/oauth/token",
    revokeUrl: "https://api.freshbooks.com/auth/oauth/revoke",
    scopes: [
      "user:profile:read",
      "user:clients:read",
      "user:clients:write",
      "user:invoices:read",
      "user:invoices:write",
      "user:expenses:read",
      "user:expenses:write",
      "user:time_entries:read",
      "user:time_entries:write",
      "user:projects:read",
    ],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(IDENTITY_URL, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        "api-version": "alpha",
        accept: "application/json",
      },
    });
    if (!res.ok) return { ok: false, message: `FreshBooks returned ${res.status}` };
    const body = await res.json().catch(() => ({})) as FreshBooksIdentity;
    if (!body.response?.id) {
      return { ok: false, message: "FreshBooks identity response missing an id" };
    }
    return { ok: true };
  },

  /**
   * Resolves `accountId` (accounting domain) and `businessId`
   * (timetracking/projects domain) from the first `owner`-role business
   * membership, falling back to the first membership that carries an
   * `account_id` at all, and finally to the first membership present.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    const res = await ctx.fetch(IDENTITY_URL, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        "api-version": "alpha",
        accept: "application/json",
      },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as FreshBooksIdentity;
    const memberships = body.response?.business_memberships ?? [];
    const chosen = memberships.find((m) => m.role === "owner" && m.business?.account_id) ??
      memberships.find((m) => m.business?.account_id) ??
      memberships[0];
    if (!chosen?.business?.id) return {};
    return {
      accountId: chosen.business.account_id,
      businessId: String(chosen.business.id),
      businessName: chosen.business.name,
      userId: body.response?.id,
      email: body.response?.email,
    };
  },
};

export default oauth2;
