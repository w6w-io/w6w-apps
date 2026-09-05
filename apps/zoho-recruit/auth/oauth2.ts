import type { AuthDefinition } from "@w6w/types";
import { formatRecruitError } from "../lib/client.ts";
import { REGIONS, type ZohoRecruitRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2-<region>`) — the only connect path Zoho Recruit offers.
 * Register a Zoho API console client (Server-based Applications) for the data
 * centre your account lives in, store `client_id` / `client_secret` /
 * `redirect_uri` on this w6w installation via
 * `PUT /apps/:id/oauth-config/oauth2-<region>`, and end users then connect via
 * the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field** — see
 * `lib/regions.ts` for why: the OAuth authorization/token host is baked into
 * the flow itself, so it cannot be chosen by a field collected mid-flow. The
 * user picks the method matching their account's data centre; every other
 * detail (scopes, header shape, probe) is identical across all ten.
 *
 * Zoho specifics, verified 2026-09-05 against
 * `https://www.zoho.com/recruit/developer-guide/apiv2/oauth-overview.html`,
 * `.../get-users.html` and live probes:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response.
 *   - Scopes are `ZohoRecruit.modules.ALL` (create/read/update/delete/convert
 *     across Candidates, Job Openings, Clients and Notes — the "modules"
 *     scope family covers all of them), `ZohoRecruit.search.READ` (the search
 *     endpoints are documented under a SEPARATE scope family — a client
 *     scoped only to `modules.ALL` will 401 on every search action) and
 *     `ZohoRecruit.users.READ` (needed only by this method's own `test`
 *     probe below).
 *   - The `Notes` module's `GET /Notes` list is documented as admin-only:
 *     "The system throws an error when non-admin users try to fetch the
 *     records from the Notes module." A non-admin connection can still
 *     create/update/delete notes; only `note-list` is affected.
 */
function buildOAuth2(region: ZohoRecruitRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Recruit account was created in the ` +
      `${region.label} data centre (accounts.zoho hostname ends in the matching region) — see the ` +
      `README's "Regional data centres" section if you are not sure which one that is.`,
    connectionLabel: `{{fullName}} (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: ["ZohoRecruit.modules.ALL", "ZohoRecruit.search.READ", "ZohoRecruit.users.READ"],
      extraAuthParams: {
        // Without these Zoho omits the refresh token, and the connection dies
        // with the 1-hour access token.
        access_type: "offline",
        prompt: "consent",
      },
      pkce: true,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Zoho-oauthtoken ${accessToken}`;
      return request;
    },

    /**
     * `GET /users?type=CurrentUser` — the cheapest authenticated call this
     * app knows: it needs only `ZohoRecruit.users.READ` and returns just the
     * caller's own profile, no organization- or record-level data. Classified
     * by the vendor's own `code`, not by HTTP status alone — both
     * `AUTHENTICATION_FAILURE` (no usable token reached the request) and
     * `INVALID_TOKEN` (a token reached it and was rejected) answer HTTP 401,
     * confirmed live against `recruit.zoho.com`.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const url = `${apiBase}/recruit/v2/users?type=CurrentUser`;
      const res = await ctx.fetch(url, {
        headers: { accept: "application/json", authorization: `Zoho-oauthtoken ${accessToken}` },
      });
      if (res.ok) return { ok: true };

      const text = await res.text();
      const message = formatRecruitError(res.status, "GET", "/recruit/v2/users", text);
      return { ok: false, message };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action —
     * then, best-effort, the authenticated user's own name for a readable
     * connection label. A failure here must not fail an otherwise-good
     * connection: `test` has already proven the token works.
     */
    async afterConnect({ credential }, ctx) {
      const base: Record<string, unknown> = { apiHost: region.apiHost, region: region.label };
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return base;

      try {
        const res = await ctx.fetch(`${apiBase}/recruit/v2/users?type=CurrentUser`, {
          headers: {
            accept: "application/json",
            authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        });
        if (!res.ok) return base;
        const body = await res.json() as {
          users?: Array<{ full_name?: string; email?: string; id?: string }>;
        };
        const user = body.users?.[0];
        if (!user) return base;
        return {
          ...base,
          userId: user.id,
          fullName: user.full_name ?? user.email ?? region.label,
        };
      } catch {
        return base;
      }
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
