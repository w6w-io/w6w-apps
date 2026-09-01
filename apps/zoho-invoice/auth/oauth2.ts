import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoInvoiceRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Invoice's only connect path. Register a Zoho
 * API console client (Server-based Applications) for the data centre your
 * organization lives in, store `client_id` / `client_secret` / `redirect_uri`
 * on this w6w installation via `PUT /apps/:id/oauth-config/oauth2-<region>`,
 * and end users then connect via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field.** See
 * `lib/regions.ts` for why: the OAuth authorization/token host is baked into
 * the flow itself, so it cannot be chosen by a field collected mid-flow — the
 * browser has already been redirected to a specific `accounts.zoho.<tld>` (or
 * `accounts.zohocloud.ca`, Canada's odd one out) by the time any such field
 * would be read. The user picks the method matching their organization's data
 * centre; every other detail (scopes, header shape, probe) is identical
 * across all eight.
 *
 * Zoho specifics, verified 2026-09-01 against
 * `https://www.zoho.com/invoice/api/v3/oauth/` and
 * `https://www.zoho.com/invoice/api/v3/introduction/`:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response — same
 *     requirement `zohobooks` documents for itself.
 *   - Scopes are `ZohoInvoice.contacts.ALL`, `ZohoInvoice.settings.ALL`
 *     (covers Items, expense categories, users, taxes and currencies — Zoho
 *     files Items under the general "settings" scope family rather than a
 *     dedicated `items` scope for its CRUD endpoints, easy to miss — and
 *     also covers `GET /organizations` itself, documented as needing
 *     `ZohoInvoice.settings.READ`) and `ZohoInvoice.estimates.ALL` /
 *     `ZohoInvoice.invoices.ALL` — the union every action in this app needs.
 *     Zoho Invoice's scope vocabulary is per-resource with `.ALL` / `.READ` /
 *     `.CREATE` / `.UPDATE` / `.DELETE` suffixes, the same shape as Zoho
 *     Books'. A separate `ZohoInvoice.items.READ` scope does exist, but it
 *     only guards the "Bulk fetch item details" endpoint, which this app
 *     does not call.
 *   - The token response's `api_domain` field (e.g. `https://www.zohoapis.com`)
 *     names the API host that matches the *authorizing* organization's data
 *     centre — read defensively in `afterConnect` below, same as this pack's
 *     `zoho` (Zoho CRM) and `zohobooks` apps. Since this method already fixes
 *     one region's `apiHost` at build time, `api_domain` is only used as a
 *     sanity check; the region's own host is what `lib/client.ts` actually
 *     addresses.
 */
function buildOAuth2(region: ZohoInvoiceRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Invoice organization was created in ` +
      `the ${region.label} data centre (accounts.zoho hostname ends in the matching region) — see ` +
      `the README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `{{primaryOrganizationName}} (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "ZohoInvoice.contacts.ALL",
        "ZohoInvoice.settings.ALL",
        "ZohoInvoice.invoices.ALL",
        "ZohoInvoice.estimates.ALL",
      ],
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
     * `GET /organizations` — the cheapest authenticated call this app knows,
     * needing only `ZohoInvoice.settings.READ` and (unlike every other
     * endpoint) no organization id at all, since it is how one is
     * discovered. Classified by the vendor's own `code`, not by HTTP status
     * alone: a request with no usable token answers `401 {"code":14,...}`
     * (`https://www.zohoapis.com/invoice/v3/organizations` with no
     * Authorization header, measured live), a syntactically-plausible but
     * dead token answers `401 {"code":57,...}` — two different problems
     * worth telling apart.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/organizations`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as { code?: number; message?: string } | null;

      if (body?.code === 57) {
        return {
          ok: false,
          message: "Zoho Invoice rejected the access token (code 57). Reconnect this connection.",
        };
      }
      if (body?.code === 14) {
        return {
          ok: false,
          message:
            "Zoho Invoice received no usable token (code 14) — the credential did not reach the request.",
        };
      }
      return {
        ok: false,
        message:
          `Zoho Invoice returned HTTP ${res.status}${body?.code ? ` (code ${body.code})` : ""} ` +
          "for /organizations",
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action —
     * then, best-effort, the authenticated user's default organization id and
     * name so most actions never need an explicit `organizationId` param (see
     * `lib/client.ts#organizationIdFrom`) and the connection gets a readable
     * label. A failure here must not fail an otherwise-good connection:
     * `test` has already proven the token works.
     */
    async afterConnect({ credential }, ctx) {
      const base: Record<string, unknown> = { apiHost: region.apiHost, region: region.label };
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return base;

      try {
        const res = await ctx.fetch(`${apiBase}${API_PREFIX}/organizations`, {
          headers: { accept: "application/json", ...authHeader(accessToken) },
        });
        if (!res.ok) return base;
        const body = await res.json() as {
          organizations?: Array<
            { organization_id?: string; name?: string; is_default_org?: boolean }
          >;
        };
        const orgs = body.organizations ?? [];
        const primary = orgs.find((o) => o.is_default_org) ?? orgs[0];
        if (!primary) return base;
        return {
          ...base,
          organizationId: primary.organization_id,
          primaryOrganizationName: primary.name,
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
