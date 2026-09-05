import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoSheetRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Sheet's only connect path. Register a Zoho API
 * console client (Server-based Applications) for the data centre your
 * account lives in, store `client_id` / `client_secret` / `redirect_uri` on
 * this w6w installation via `PUT /apps/:id/oauth-config/oauth2-<region>`, and
 * end users then connect via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field** — see
 * `lib/regions.ts` for the full reasoning (shared with this pack's
 * `zohobooks` app): the OAuth authorization/token host is baked into the flow
 * itself, so it cannot be chosen by a field collected mid-flow. The user
 * picks the method matching their account's data centre.
 *
 * Zoho specifics, verified live 2026-09-05 against
 * `https://www.zoho.com/sheet/help/api/v2/`:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response.
 *   - Scopes are `ZohoSheet.dataAPI.READ` and `ZohoSheet.dataAPI.UPDATE` — the
 *     entire scope vocabulary this API documents (there is no per-resource
 *     scope family the way CRM/Books have); every action in this app needs
 *     one or the other, so both are requested.
 *   - **Seven data centres, not eight** — Zoho Sheet has no Canadian API host
 *     at all (`sheet.zoho.ca` doesn't resolve; `www.zohoapis.ca`'s Sheet path
 *     answers a real `404 API endpoint not found`) — see `lib/regions.ts`.
 *   - There is no `api_domain`-style field in the token response to sanity-
 *     check against (unlike Zoho CRM/Books) — the region's fixed `apiHost` is
 *     the only source of truth, recorded unconditionally in `afterConnect`.
 */
function buildOAuth2(region: ZohoSheetRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho account was created in the ` +
      `${region.label} data centre (accounts.zoho hostname ends in the matching region) — see ` +
      `the README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `Zoho Sheet (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: ["ZohoSheet.dataAPI.READ", "ZohoSheet.dataAPI.UPDATE"],
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
     * `workbook.list` at `POST /api/v2/workbooks` — the cheapest authenticated
     * call this app knows, needing only `ZohoSheet.dataAPI.READ` and no
     * `resource_id` at all. Classified by the vendor's own `error_code`, not
     * HTTP status alone: confirmed live against `sheet.zoho.com` that both a
     * missing Authorization header and a syntactically-present-but-dead token
     * answer `401 {"error_code":2401,...}` — the message text differs
     * ("[authorization ticket]" vs "[OAUTHTOKEN]") but Zoho gives no separate
     * code for the two cases the way Zoho Books does, so this only reports
     * "the credential did not work," not which flavor of not-working.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/workbooks`, {
        method: "POST",
        headers: { accept: "application/json", ...authHeader(accessToken) },
        body: "method=workbook.list&count=1",
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as
        | { error_code?: number; error_message?: string }
        | null;
      if (body?.error_code === 2401) {
        return {
          ok: false,
          message: `Zoho Sheet rejected the access token (error_code 2401): ${
            body.error_message ?? "no usable authorization ticket"
          }`,
        };
      }
      return {
        ok: false,
        message: `Zoho Sheet returned HTTP ${res.status}${
          body?.error_code ? ` (error_code ${body.error_code})` : ""
        } for workbook.list`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action.
     * There is nothing else worth fetching eagerly (no default "workbook"
     * concept the way Books has a default organization): every action here
     * already takes an explicit workbook id.
     */
    afterConnect() {
      return { apiHost: region.apiHost, region: region.label };
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
