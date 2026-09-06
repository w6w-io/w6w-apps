import type { AuthDefinition } from "@w6w/types";
import { fetchAdministrations } from "../lib/client.ts";

/**
 * Moneybird OAuth 2.0 — the multi-tenant path.
 *
 * Registered at `https://moneybird.com/user/applications/new` (choosing the
 * "external OAuth application" option instead of a personal token), per
 * `developer.moneybird.com/authentication`. Client id/secret/redirect URI are
 * configured on this w6w installation via `PUT /apps/:id/oauth-config/oauth2`;
 * end users then connect through the browser authorization flow.
 *
 * ## No PKCE, no expiry (documented, for now)
 *
 * The vendor's docs describe a plain authorization-code exchange with no PKCE
 * parameter, and say the access token "does not expire, but we might change
 * this in the future" while still issuing a `refresh_token` — so
 * `refreshUrl` is set and will simply go unused until that changes.
 *
 * ## Scopes
 *
 * `sales_invoices` is requested — the default Moneybird itself falls back to
 * when no `scope` is given, and (per the docs' own note) contacts are
 * reachable through ANY of `sales_invoices`, `documents`, `estimates`,
 * `bank`, or `settings` — never through `time_entries` alone. `estimates` is
 * added because contacts and future estimate support both need it and it
 * costs nothing this app doesn't already ask for via `sales_invoices`.
 *
 * ## Resolving the administration
 *
 * Identical to `auth/personal-token.ts` — see that file's module doc. An
 * OAuth token can reach every administration the authorizing user granted,
 * not just one, so `afterConnect` still has to pick a first and record it.
 */

export interface MoneybirdOAuthCredential {
  accessToken: string;
  refreshToken?: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Moneybird)",
  description: "Public OAuth flow. Requires a Moneybird external application registered on this " +
    "w6w installation.",
  connectionLabel: "Moneybird ({{administrationName}})",
  oauth2: {
    authorizationUrl: "https://moneybird.com/oauth/authorize",
    tokenUrl: "https://moneybird.com/oauth/token",
    refreshUrl: "https://moneybird.com/oauth/token",
    revokeUrl: "https://moneybird.com/oauth/revoke",
    scopes: ["sales_invoices", "estimates"],
    scopeSeparator: " ",
  },

  sign({ request, credential }) {
    const { accessToken } = credential as Partial<MoneybirdOAuthCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `ctx.fetch` is unsigned during every auth-lifecycle hook other than
   * `sign` itself (Hook Runtime RFC), so the bearer header is stamped by hand
   * here — same as this pack's Xero `oauth2.ts`.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as Partial<MoneybirdOAuthCredential>;
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    try {
      const admins = await fetchAdministrations(ctx, { authorization: `Bearer ${accessToken}` });
      if (admins.length === 0) {
        return {
          ok: false,
          message: "Moneybird accepted the token but it reaches no administration",
        };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  /** Resolve and remember the first accessible administration. */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as Partial<MoneybirdOAuthCredential>;
    if (!accessToken) return {};
    try {
      const admins = await fetchAdministrations(ctx, { authorization: `Bearer ${accessToken}` });
      const first = admins[0];
      if (!first) return {};
      return {
        administrationId: String(first.id),
        administrationName: first.name,
        administrations: admins.map((a) => ({ id: String(a.id), name: a.name })),
      };
    } catch {
      return {};
    }
  },
};

export default oauth2;
