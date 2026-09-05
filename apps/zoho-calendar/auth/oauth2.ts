import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoCalendarRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Calendar's only connect path. Register a Zoho API console client
 * (Server-based Applications) for the data centre your account lives in, store `client_id` /
 * `client_secret` / `redirect_uri` on this w6w installation via
 * `PUT /apps/:id/oauth-config/oauth2-<region>`, and end users then connect via the browser
 * authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field.** See `lib/regions.ts` for
 * why: the OAuth authorization/token host is baked into the flow itself, so it cannot be chosen by
 * a field collected mid-flow — the browser has already been redirected to a specific
 * `accounts.zoho.<tld>` (or `accounts.zohocloud.ca`, Canada's odd one out) by the time any such
 * field would be read. The user picks the method matching their account's data centre; every other
 * detail (scopes, header shape, probe) is identical across all eight.
 *
 * Zoho specifics, verified live 2026-09-05 against `https://www.zoho.com/calendar/help/api/*`:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without them Zoho omits the
 *     refresh token from the exchange response, and the connection dies with the access token's
 *     short lifetime.
 *   - Scopes are `ZohoCalendar.calendar.ALL` (calendars), `ZohoCalendar.event.ALL` (events),
 *     `ZohoCalendar.search.ALL` (the `/search` endpoint) and `ZohoCalendar.freebusy.ALL` (the
 *     `/calendars/freebusy` endpoint) — the union every action in this app needs. Zoho Calendar's
 *     scope vocabulary is per-resource with `.ALL` / `.READ` / `.CREATE` / `.UPDATE` / `.DELETE`
 *     suffixes, the same shape as Zoho Books' and Zoho Mail's. `ZohoMeeting.meeting.ALL` — needed
 *     only to attach a live Zoho Meeting conference link when creating/updating an event — is
 *     deliberately NOT requested here; see the README's "Deliberately absent" section for why the
 *     `conference` field is left out of this app rather than shipped half-working without it.
 *   - The token response's `api_domain` field (e.g. `https://calendar.zoho.com`) names the API host
 *     that matches the *authorizing* account's data centre — read defensively in `afterConnect`
 *     below as a sanity check, same as this pack's `zoho` (CRM), `zohobooks` and `zohodesk` apps.
 *     Since this method already fixes one region's `apiHost` at build time, the region's own host is
 *     what `lib/client.ts` actually addresses.
 */
function buildOAuth2(region: ZohoCalendarRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Calendar account was created in the ` +
      `${region.label} data centre (accounts.zoho hostname ends in the matching region) — see the ` +
      `README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `Zoho Calendar (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "ZohoCalendar.calendar.ALL",
        "ZohoCalendar.event.ALL",
        "ZohoCalendar.search.ALL",
        "ZohoCalendar.freebusy.ALL",
      ],
      extraAuthParams: {
        // Without these Zoho omits the refresh token, and the connection dies
        // once the short-lived access token expires.
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
     * `GET /calendars` — the cheapest authenticated call this app knows, needing only
     * `ZohoCalendar.calendar.READ` and no path parameters at all. Classified by the vendor's own
     * `error_code`, not by HTTP status alone: an unsigned request answers `400
     * {"error":[{"error_code":"INVALID_TICKET",...}]}` (confirmed live, no Authorization header at
     * all), a syntactically-plausible but dead token answers `401
     * {"error":[{"error_code":"INVALID_OAUTHTOKEN",...}]}` — two different problems worth telling
     * apart, the same way `zohobooks`/`zohodesk` distinguish their own two error codes.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/calendars`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as {
        error?: Array<{ error_code?: string; description?: string }>;
      } | null;
      const code = body?.error?.[0]?.error_code;

      if (code === "INVALID_OAUTHTOKEN") {
        return {
          ok: false,
          message: "Zoho Calendar rejected the access token (INVALID_OAUTHTOKEN). Reconnect this " +
            "connection.",
        };
      }
      if (code === "INVALID_TICKET") {
        return {
          ok: false,
          message: "Zoho Calendar received no usable token (INVALID_TICKET) — the credential did " +
            "not reach the request.",
        };
      }
      return {
        ok: false,
        message: `Zoho Calendar returned HTTP ${res.status}${
          code ? ` (${code})` : ""
        } for /calendars`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally —
     * `lib/client.ts#apiHostFromConnection` reads it back on every action. A failure here must not
     * fail an otherwise-good connection: `test` has already proven the token works.
     */
    afterConnect() {
      return { apiHost: region.apiHost, region: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
