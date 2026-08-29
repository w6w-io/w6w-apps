import type { AuthDefinition } from "@w6w/types";
import { baseUrl, formatWrikeError, WRIKE_HOSTS, type WrikeHost } from "../lib/client.ts";

/**
 * Wrike Permanent Access Token — `Authorization: Bearer <token>`.
 *
 * Verified 2026-08-29 against `developers.wrike.com/docs/mcp-legacy-authentication-pat`
 * (Wrike's own PAT guide), `developers.wrike.com/docs/oauth-20-authorization`
 * (the `HTTP`/bearer security scheme every endpoint's OpenAPI document
 * declares — "Use OAuth 2.0 access token or permanent access token for
 * authorization" — is identical for both), and a live probe of
 * `www.wrike.com/api/v4/version`.
 *
 * ## PAT over OAuth2, deliberately
 *
 * Wrike's own PAT guide recommends OAuth 2.0 "for team deployments" and PAT
 * "for individual use or testing", but a workflow Connection is exactly the
 * server-to-server case OAuth's three-legged, browser-redirect flow is built
 * to avoid: no user is present to click through a consent screen on every
 * token refresh, and a PAT — generated once from Wrike's own App Console and
 * pasted in — never expires on its own (unlike an OAuth access token's
 * documented 1-hour lifetime, which would need a `refresh` hook and its own
 * client id/secret this app does not have a mechanism to collect). This
 * mirrors Apify's identical choice for the same reason (`apify/auth/api-token.ts`).
 *
 * ## The host is not part of the token's bytes
 *
 * Wrike stores customer data in one of three fixed data centers, and a
 * request against the wrong one answers `401 not_authorized` — indistinguishable
 * from a bad token. A PAT is generated from inside an already-logged-in
 * workspace, so Wrike's own docs give no separate "which host is this token
 * for" signal; the host is a property of the *account* the connecting user
 * chooses, not something derivable from the pasted string. So it is collected
 * as an ordinary form field here (not `secret` — knowing which of three public
 * hostnames an account lives on discloses nothing), and echoed onto the
 * Connection's `display` by `afterConnect` so `lib/client.ts`'s
 * `hostFromConnection` can read it back without ever touching the credential.
 *
 * ## The probe is `/version`, not a whoami
 *
 * `GET /version` was chosen over the more obvious `GET /contacts?me=true`
 * (Wrike's own "get info about yourself" example in the OAuth guide) for two
 * reasons, both confirmed live against `www.wrike.com/api/v4/version` on
 * 2026-08-29:
 *
 *  1. **It needs no scope.** Every list/read endpoint in this app's surface
 *     documents `Scopes: Default, wsReadOnly, wsReadWrite`; `/version`'s own
 *     reference page names no scope requirement at all, so it is reachable by
 *     the narrowest token Wrike can issue.
 *  2. **It returns nothing about the account.** `{"data":[{"major":4,"minor":0}]}`
 *     — a fixed version pair, not a name, email or account id. `/contacts?me=true`
 *     is not unsafe (Wrike does not consider a user's own name/email a
 *     credential), but it is unnecessary for the one question `test` has to
 *     answer, so it is reserved for `afterConnect`'s display-label job instead.
 *
 * An unauthenticated or invalid-token request to `/version` was confirmed live
 * to answer `401 {"error":"not_authorized","errorDescription":"Access token is
 * unknown or invalid"}` — proving the endpoint genuinely requires a live
 * credential rather than answering the same 200 to everyone.
 */

export interface WrikeCredential {
  token: string;
  host: WrikeHost;
}

const hostOptions = WRIKE_HOSTS.map((h) => ({
  value: h,
  label: h === "www.wrike.com"
    ? `${h} (default / US)`
    : h.includes("eu")
    ? `${h} (EU)`
    : `${h} (US2)`,
}));

export function authHeaders(credential: Partial<WrikeCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.token ?? ""}` };
}

const permanentToken: AuthDefinition = {
  key: "permanent-token",
  type: "bearer",
  displayName: "Permanent Access Token",
  description:
    "Generate a token from your Wrike workspace: profile icon → Apps & Integrations → API → " +
    "+ App → Get Token. Recommended by Wrike for individual/service integrations.",
  connectionLabel: "Wrike ({{name}})",
  fields: [
    {
      key: "host",
      label: "Data center",
      type: "select",
      required: true,
      default: "www.wrike.com",
      options: hostOptions,
      hint: "Which regional host your Wrike account's data lives on. Most accounts are US " +
        "(www.wrike.com); check your Wrike URL in the browser if unsure — an EU or US2 account " +
        "will show app-eu.wrike.com or app-us2.wrike.com instead of www.wrike.com.",
    },
    {
      key: "token",
      label: "Permanent Access Token",
      type: "secret",
      required: true,
      hint: "Wrike workspace → profile icon → Apps & Integrations → API → + App → Get Token.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<WrikeCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module doc's "The probe is /version, not a whoami" for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<WrikeCredential>;
    const token = (cred?.token ?? "").trim();
    const host = cred?.host;
    if (!token) return { ok: false, message: "credential missing token" };
    if (!host) return { ok: false, message: "credential missing host — select your data center" };

    const res = await ctx.fetch(`${baseUrl(host)}/version`, {
      headers: { accept: "application/json", ...authHeaders({ token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: string; errorDescription?: string }
      | null;

    if (res.status === 401) {
      return {
        ok: false,
        message:
          `Wrike rejected the token (401 ${
            body?.error ?? "not_authorized"
          }). Check the token was ` +
          "copied exactly, has not been revoked, and that the selected data center matches your " +
          "account's actual Wrike URL.",
      };
    }
    return {
      ok: false,
      message: formatWrikeError(res.status, "GET", "/version", JSON.stringify(body ?? {})),
    };
  },

  /**
   * Records the host (needed by every action) and fetches the requesting
   * user's display name for `connectionLabel` — nothing else off the contact
   * record is kept.
   *
   * `GET /contacts?me=true` is Wrike's own documented way to identify "the
   * user this token belongs to" (`docs/oauth-20-authorization` §4). A failure
   * here is deliberately non-fatal: `test` already established the token is
   * live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<WrikeCredential>;
    const host = cred?.host;
    if (!host) return {};
    try {
      const res = await ctx.fetch(`${baseUrl(host)}/contacts?me=true`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return { host };
      const body = await res.json().catch(() => null) as
        | { data?: Array<{ id?: string; firstName?: string; lastName?: string }> }
        | null;
      const me = body?.data?.[0];
      if (!me) return { host };
      const name = [me.firstName, me.lastName].filter(Boolean).join(" ").trim();
      return name ? { host, name, contactId: me.id } : { host, contactId: me.id };
    } catch {
      return { host };
    }
  },
};

export default permanentToken;
