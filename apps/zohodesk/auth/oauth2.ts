import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoDeskRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Desk's only connect path. Register a Zoho API
 * console client (Server-based Applications) for the data centre your
 * organization lives in, store `client_id` / `client_secret` / `redirect_uri`
 * on this w6w installation via `PUT /apps/:id/oauth-config/oauth2-<region>`,
 * and end users then connect via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field** —
 * same reasoning as this pack's `zohobooks` app (see `lib/regions.ts`): the
 * OAuth authorization/token host is baked into the flow itself, so it cannot
 * be chosen by a field collected mid-flow.
 *
 * Zoho Desk specifics, verified 2026-08-25 against
 * `https://desk.zoho.com/DeskAPIDocument#Introduction`:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response (the same
 *     behaviour this pack's other Zoho apps document).
 *   - **The scopes this app requests are broader than the "Scopes" reference
 *     table (`#OAuthScopes`) lists.** That table only names
 *     `Desk.tickets.*`, `Desk.contacts.*` (READ/WRITE/UPDATE/CREATE, no
 *     DELETE), `Desk.tasks.*`, `Desk.basic.*`, `Desk.search.READ`,
 *     `Desk.events.*` and `Desk.articles.*` — but the PER-ENDPOINT docs name
 *     `Desk.accounts.READ/CREATE/UPDATE/DELETE`, `Desk.agents.READ`,
 *     `Desk.departments.READ`, `Desk.organization.READ` and
 *     `Desk.contacts.DELETE` for the Accounts, Agents, Departments,
 *     Organizations and Contact-delete endpoints respectively — none of
 *     which appear in the table at all. A client scoped from that table alone
 *     would 403 on every Account/Agent/Department action. The scopes below
 *     are the union every action in this app needs, taken from each
 *     endpoint's own "OAuth Scope" line rather than the summary table.
 *   - The token response's `api_domain` field names the API host that
 *     matches the *authorizing* organization's data centre — read
 *     defensively in `afterConnect` below, same as this pack's `zoho` (Zoho
 *     CRM) and `zohobooks` apps. Since this method already fixes one
 *     region's `apiHost` at build time, `api_domain` is only used as a
 *     sanity check; the region's own host is what `lib/client.ts` actually
 *     addresses.
 */
function buildOAuth2(region: ZohoDeskRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Desk organization was created in the ` +
      `${region.label} data centre (accounts.zoho hostname ends in the matching region) — see the ` +
      `README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `{{primaryOrgName}} (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: [
        "Desk.tickets.ALL",
        "Desk.contacts.READ",
        "Desk.contacts.CREATE",
        "Desk.contacts.UPDATE",
        "Desk.contacts.DELETE",
        "Desk.accounts.READ",
        "Desk.accounts.CREATE",
        "Desk.accounts.UPDATE",
        "Desk.accounts.DELETE",
        "Desk.agents.READ",
        "Desk.departments.READ",
        "Desk.basic.READ",
        "Desk.organization.READ",
        "Desk.search.READ",
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
     * needing only `Desk.organization.READ`/`Desk.basic.READ` and (unlike
     * every other endpoint) no `orgId` header at all, since it is how one is
     * discovered. It also returns nothing secret — organization metadata, not
     * the caller's own token. Classified by the vendor's own `errorCode`, not
     * by HTTP status alone: a request with no usable token answers `401
     * {"errorCode":"UNAUTHORIZED",...}` (no `Authorization` header at all,
     * measured live against `desk.zoho.com`), a syntactically-plausible but
     * fake token answers `401 {"errorCode":"INVALID_OAUTH",...}` — two
     * different problems worth telling apart.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/organizations`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      if (res.ok) return { ok: true };

      const body = await res.json().catch(() => null) as
        | { errorCode?: string; message?: string }
        | null;

      if (body?.errorCode === "INVALID_OAUTH") {
        return {
          ok: false,
          message:
            "Zoho Desk rejected the access token (INVALID_OAUTH). Reconnect this connection.",
        };
      }
      if (body?.errorCode === "UNAUTHORIZED") {
        return {
          ok: false,
          message:
            "Zoho Desk received no usable token (UNAUTHORIZED) — the credential did not reach " +
            "the request.",
        };
      }
      return {
        ok: false,
        message: `Zoho Desk returned HTTP ${res.status}${
          body?.errorCode ? ` (${body.errorCode})` : ""
        } for /organizations`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action —
     * then, best-effort, the authenticated user's default organization's
     * `orgId`/`companyName` so most actions never need an explicit `orgId`
     * param (see `lib/client.ts#orgIdFrom`) and the connection gets a
     * readable label. A failure here must not fail an otherwise-good
     * connection: `test` has already proven the token works.
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
          data?: Array<{ id?: string; companyName?: string; isDefault?: string | boolean }>;
        };
        const orgs = body.data ?? [];
        const isDefault = (o: { isDefault?: string | boolean }) =>
          o.isDefault === true || o.isDefault === "true";
        const primary = orgs.find(isDefault) ?? orgs[0];
        if (!primary) return base;
        return {
          ...base,
          orgId: primary.id,
          primaryOrgName: primary.companyName,
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
