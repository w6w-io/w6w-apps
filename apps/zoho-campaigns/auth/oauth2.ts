import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoCampaignsRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Campaigns' only connect path. Register a Zoho
 * API console client (Server-based Applications) for the data centre your
 * account lives in, store `client_id` / `client_secret` / `redirect_uri` on
 * this w6w installation via `PUT /apps/:id/oauth-config/oauth2-<region>`, and
 * end users then connect via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field.** See
 * `lib/regions.ts` for why: the OAuth authorization/token host is baked into
 * the flow itself, so it cannot be chosen by a field collected mid-flow — the
 * browser has already been redirected to a specific `accounts.zoho.<tld>` (or
 * `accounts.zohocloud.ca`, Canada's odd one out — for Campaigns, ITS API
 * host too, see `lib/regions.ts`) by the time any such field would be read.
 * The user picks the method matching their account's data centre; every
 * other detail (scopes, header shape, probe) is identical across all eight.
 *
 * Zoho specifics, verified 2026-09-05 against
 * `https://www.zoho.com/campaigns/help/developers/access-token.html`:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response — the
 *     same requirement this pack's other Zoho apps document for themselves.
 *   - Scopes are `ZohoCampaigns.contact.ALL` (covers mailing lists,
 *     contacts, segments and custom fields — Zoho Campaigns files all of
 *     those under the single "contact" scope family, confirmed against the
 *     scope table on `access-token.html` and every linked list/contact
 *     endpoint page) and `ZohoCampaigns.campaign.ALL` (covers campaigns) —
 *     the union every action in this app needs. Zoho Campaigns' scope
 *     vocabulary is per-resource with `.READ` / `.CREATE` / `.UPDATE` /
 *     `.DELETE` suffixes plus the combined `.CREATE-UPDATE` / `.WRITE` /
 *     `.ALL` aliases, the same shape as this pack's other Zoho apps.
 *   - Unlike `zoho-invoice`/`zohobooks`, there is no per-organization
 *     `api_domain` field to sanity-check on the token response — Zoho
 *     Campaigns' token exchange is a plain OAuth2 grant with no
 *     organization concept at all (see `lib/client.ts`'s module doc).
 */
function buildOAuth2(region: ZohoCampaignsRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Campaigns account was created in ` +
      `the ${region.label} data centre (accounts.zoho hostname ends in the matching region) — see ` +
      `the README's "Regional data centres" section if you are not sure which one that is.`,
    connectionLabel: `Zoho Campaigns (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: ["ZohoCampaigns.contact.ALL", "ZohoCampaigns.campaign.ALL"],
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
     * `GET /api/v1.1/getmailinglists` — the cheapest authenticated call this
     * app knows, needing only `ZohoCampaigns.contact.READ` and returning
     * nothing secret. **Unlike `zoho-invoice`, Zoho Campaigns does not
     * distinguish "no token" from "a dead token" in its response** —
     * confirmed live: both answer `401
     * {"status":"error","Code":"1007","message":"Unauthorized request."}`,
     * so this hook cannot report which of the two happened, only that the
     * credential did not work.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/getmailinglists?resfmt=JSON`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as
        | { Code?: string; code?: string; message?: string }
        | null;
      const code = body?.Code ?? body?.code;
      return {
        ok: false,
        message: body?.message
          ? `Zoho Campaigns rejected the request${code ? ` (code ${code})` : ""}: ${body.message}`
          : `Zoho Campaigns returned HTTP ${res.status} for /getmailinglists`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action.
     * There is no per-account discovery call to enrich the label with (no
     * `/organizations`-equivalent, no documented whoami endpoint) — `test`
     * has already proven the token works, so a failure here must not fail an
     * otherwise-good connection.
     */
    afterConnect(_input, _ctx) {
      return { apiHost: region.apiHost, region: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
