import type { AuthDefinition } from "@w6w/types";
import { API_PREFIX } from "../lib/client.ts";
import { REGIONS, type ZohoBookingsRegion } from "../lib/regions.ts";

/**
 * OAuth 2.0 (`oauth2`) — Zoho Bookings' only connect path. Register a Zoho
 * API console client (Server-based Applications) for the data centre your
 * account lives in, store `client_id` / `client_secret` / `redirect_uri` on
 * this w6w installation via `PUT /apps/:id/oauth-config/oauth2-<region>`,
 * and end users then connect via the browser authorization dance.
 *
 * **One `AuthDefinition` per data centre, not one with a region field** — see
 * `lib/regions.ts` for why: the OAuth authorization/token host is baked into
 * the flow itself, so it cannot be chosen by a field collected mid-flow. The
 * user picks the method matching their account's data centre; every other
 * detail (scope, header shape, probe) is identical across all eight.
 *
 * Verified 2026-09-05 against the archived
 * `https://www.zoho.com/bookings/help/api/v1/oauthauthentication.html` and
 * `generate-accesstoken.html` (fetched via the Wayback Machine — see
 * `lib/client.ts` module docs):
 *
 *   - `access_type=offline` + `prompt=consent` on the authorize URL: without
 *     them Zoho omits the refresh token from the exchange response, the same
 *     requirement this pack's `zoho`/`zohobooks`/`zohodesk` apps document.
 *   - **A single scope covers the entire API**: `zohobookings.data.CREATE`,
 *     documented as "Grants permission to perform supported actions in Zoho
 *     Bookings" — i.e., despite the `.CREATE` suffix it is not read-only, and
 *     it is the ONLY scope this product's docs mention (unlike
 *     `zohobooks`/`zoho` CRM's per-resource `.ALL`/`.READ` scope families).
 *   - The token response's `api_domain` field (e.g. `https://www.zohoapis.com`)
 *     names the API host matching the *authorizing* account's data centre —
 *     read defensively in `afterConnect` below as a sanity check, same as
 *     this pack's other Zoho apps; the region's own fixed host, not
 *     `api_domain`, is what `lib/client.ts` actually addresses.
 */
function buildOAuth2(region: ZohoBookingsRegion): AuthDefinition {
  const apiBase = `https://${region.apiHost}`;

  function authHeader(accessToken: string): Record<string, string> {
    return { authorization: `Zoho-oauthtoken ${accessToken}` };
  }

  return {
    key: `oauth2-${region.key}`,
    type: "oauth2",
    displayName: `OAuth (${region.label} data centre)`,
    description:
      `Sign in with Zoho. Use this method only if your Zoho Bookings account was created in the ` +
      `${region.label} data centre (accounts.zoho hostname ends in the matching region) — see the ` +
      `README's "Regional accounts" section if you are not sure which one that is.`,
    connectionLabel: `{{primaryWorkspaceName}} (${region.label})`,
    oauth2: {
      authorizationUrl: `https://${region.accountsHost}/oauth/v2/auth`,
      tokenUrl: `https://${region.accountsHost}/oauth/v2/token`,
      refreshUrl: `https://${region.accountsHost}/oauth/v2/token`,
      scopes: ["zohobookings.data.CREATE"],
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
     * `GET /workspaces` (no `workspace_id`) — the cheapest authenticated call
     * this app knows, since it is how a workspace id is discovered and needs
     * no scope beyond the one this app already requests. Zoho Bookings gives
     * NO distinguishing JSON body on an auth failure — see `lib/client.ts`
     * module docs — so, uniquely in this app, classification falls back to
     * the HTTP status itself: measured live 2026-09-05 against
     * `https://www.zohoapis.com/bookings/v1/json/workspaces`, a request with
     * no `Authorization` header answers `400`, one with a dead token answers
     * `401`, both as a generic `text/html` gateway page rather than the
     * documented `{"response": {...}}` envelope.
     */
    async test({ credential }, ctx) {
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${apiBase}${API_PREFIX}/workspaces`, {
        headers: { accept: "application/json", ...authHeader(accessToken) },
      });
      const contentType = res.headers.get("content-type") ?? "";

      if (res.ok) {
        if (!contentType.includes("json")) {
          return {
            ok: false,
            message: `Zoho Bookings answered HTTP ${res.status} with non-JSON content — cannot ` +
              "confirm success.",
          };
        }
        const body = await res.json().catch(() => null) as {
          response?: { status?: string };
        } | null;
        if (body?.response?.status === "success") return { ok: true };
        return {
          ok: false,
          message: `Zoho Bookings responded without a success status (${
            JSON.stringify(body?.response?.status ?? null)
          }).`,
        };
      }

      if (res.status === 401) {
        return {
          ok: false,
          message: "Zoho Bookings rejected the access token (HTTP 401). Reconnect this connection.",
        };
      }
      if (res.status === 400) {
        return {
          ok: false,
          message:
            "Zoho Bookings received no usable token (HTTP 400) — the credential did not reach " +
            "the request.",
        };
      }
      return {
        ok: false,
        message: `Zoho Bookings returned HTTP ${res.status} for GET /workspaces`,
      };
    },

    /**
     * Records this region's fixed `apiHost` on the connection unconditionally
     * — `lib/client.ts#apiHostFromConnection` reads it back on every action —
     * then, best-effort, the first workspace's id and name so most actions
     * never need an explicit `workspaceId` param (see
     * `lib/client.ts#workspaceIdFrom`) and the connection gets a readable
     * label. Zoho Bookings' workspace list carries no "default" flag (unlike
     * Zoho Books' `is_default_org`), so this is simply the first entry
     * returned. A failure here must not fail an otherwise-good connection:
     * `test` has already proven the token works.
     */
    async afterConnect({ credential }, ctx) {
      const base: Record<string, unknown> = { apiHost: region.apiHost, region: region.label };
      const cred = credential as { accessToken?: string };
      const accessToken = (cred?.accessToken ?? "").trim();
      if (!accessToken) return base;

      try {
        const res = await ctx.fetch(`${apiBase}${API_PREFIX}/workspaces`, {
          headers: { accept: "application/json", ...authHeader(accessToken) },
        });
        if (!res.ok) return base;
        const body = await res.json() as {
          response?: { returnvalue?: { data?: Array<{ id?: string; name?: string }> } };
        };
        const first = body.response?.returnvalue?.data?.[0];
        if (!first) return base;
        return { ...base, workspaceId: first.id, primaryWorkspaceName: first.name };
      } catch {
        return base;
      }
    },
  };
}

const oauth2Methods: AuthDefinition[] = REGIONS.map(buildOAuth2);

export default oauth2Methods;
export { buildOAuth2 };
