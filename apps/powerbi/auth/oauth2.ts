/**
 * OAuth 2.0 authorization code flow against the Microsoft identity platform
 * (Microsoft Entra ID), v2.0 endpoints — but for the **Power BI Service**
 * resource, not Microsoft Graph.
 *
 * https://learn.microsoft.com/en-us/rest/api/power-bi/ ("Scopes" section) ·
 * https://learn.microsoft.com/en-us/power-bi/developer/embedded/register-app
 *
 * You register an application (Entra admin center → App registrations →
 * API permissions → add "Power BI Service"), add a Web redirect URI, and
 * store the resulting `client_id` + `client_secret` + `redirect_uri` on the
 * w6w server via `PUT /apps/:id/oauth-config/oauth2`.
 *
 * Microsoft/Power BI specifics that drove the config below — each one a
 * deliberate departure from this pack's other Microsoft apps, not an
 * oversight:
 *
 *   - **Power BI scopes are resource-qualified URLs, not bare Graph-style
 *     names.** Graph apps in this pack (`sharepoint`, `teams`) request scopes
 *     like `Sites.Read.All` against the implicit Graph resource. Power BI's
 *     REST API is a *separate* Azure AD resource — its app ID URI is
 *     `https://analysis.windows.net/powerbi/api` — so every scope this App
 *     requests is that full URL plus the permission name, e.g.
 *     `https://analysis.windows.net/powerbi/api/Workspace.Read.All`. Verified
 *     against Microsoft's own official sample
 *     (`microsoft/PowerBI-Developer-Samples`, `.NET Core/Embed for your
 *     organization/UserOwnsData/appsettings.json`), which requests exactly
 *     this scope shape.
 *
 *   - **Tenant segment: `common`, not `organizations`.** The same Microsoft
 *     sample above configures `TenantId: "common"` for the Power BI
 *     user-owns-data flow — unlike this pack's `sharepoint` App, which uses
 *     `organizations` because every SharePoint permission table explicitly
 *     states "Not supported" for a personal Microsoft account. Power BI's own
 *     reference carries no such blanket statement, and Microsoft's own sample
 *     uses the permissive tenant segment; a personal account that has no
 *     Power BI workspace still simply gets an empty `Get Workspaces` result
 *     rather than a documented rejection at the token endpoint.
 *
 *   - **Refresh tokens come from a scope, not a parameter** (same as
 *     `sharepoint`) — `offline_access` is requested explicitly; there is no
 *     `extraAuthParams`.
 *
 *   - **PKCE** stays on (the spec default, and Microsoft's guidance
 *     recommends it for every application type).
 *
 * Scopes are the least-privileged set that covers every action in this App,
 * each one taken from the endpoint reference's own "Required Scope" line:
 *
 *   - `Workspace.ReadWrite.All` — every workspace action: list, create,
 *     delete a workspace, list/add workspace users. (`Create Group` /
 *     `Delete Group` / `Add Group User` document ONLY the ReadWrite scope,
 *     with no Read-only alternative for those write calls.)
 *   - `Report.ReadWrite.All` — list/get/delete reports and the export-to-file
 *     flow. (`Delete Report` documents only the ReadWrite scope.)
 *   - `Dataset.ReadWrite.All` — list/get datasets, refresh a dataset, read
 *     refresh history, execute a DAX query. (`Refresh Dataset` documents only
 *     the ReadWrite scope.)
 *   - `Dashboard.Read.All` — list dashboards and dashboard tiles. This App
 *     offers no dashboard write, so the read-only scope is enough.
 *   - `offline_access` — refresh token.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Power BI's own Azure AD resource host — NOT Microsoft Graph's `.default`.
 * Never fetched directly (nothing in this App calls it); it only ever
 * appears inside a scope string handed to `login.microsoftonline.com`, which
 * is why it's a separate host constant rather than a `network.allow` entry.
 */
const RESOURCE_HOST = "analysis.windows.net";
const RESOURCE = `https://${RESOURCE_HOST}/powerbi/api`;

/** See the tenant-segment note above: Power BI's own sample uses `common`, unlike `sharepoint`'s `organizations`. */
const TENANT = "common";

export const AUTHORIZATION_URL =
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
export const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

export const SCOPES = [
  "offline_access",
  `${RESOURCE}/Workspace.ReadWrite.All`,
  `${RESOURCE}/Report.ReadWrite.All`,
  `${RESOURCE}/Dataset.ReadWrite.All`,
  `${RESOURCE}/Dashboard.Read.All`,
];

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Microsoft)",
  description:
    "OAuth flow for a Microsoft account with a Power BI license. Requires a Microsoft Entra ID app registration (client_id / client_secret / redirect_uri) with the 'Power BI Service' API permission configured on this w6w installation.",
  oauth2: {
    authorizationUrl: AUTHORIZATION_URL,
    tokenUrl: TOKEN_URL,
    scopes: SCOPES,
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /availableFeatures` is the cheapest authenticated Power BI call: the
   * reference states plainly "This API call doesn't require any scopes," so a
   * credential that legitimately carries none of this App's four workspace
   * scopes (a brand-new consent, still propagating) still reports as live
   * rather than as broken — the same "narrowest usable credential" reasoning
   * as the sibling `sharepoint` App's `GET /me` probe. Power BI's REST API
   * has no `/me`-shaped identity endpoint of its own, so this is also the
   * closest thing to a whoami this vendor offers.
   * https://learn.microsoft.com/en-us/rest/api/power-bi/available-features/get-available-features
   *
   * It also passes the *don't echo the credential* test: the `features` array
   * it returns is a list of feature-flag names/states and carries no token,
   * key or secret of any kind.
   *
   * Classification is header-based, not body-based, because a Power BI auth
   * failure carries no JSON body at all — verified live 2026-08-30, both an
   * unauthenticated request and a syntactically-bogus bearer token come back
   * `403` with `content-length: 0`. The one vendor-issued signal is the
   * `x-powerbi-error-info` response header (e.g. `InvalidToken`), which is
   * what this reads — see `../lib/client.ts`'s `describeFailure()` for the
   * same reasoning applied to every action.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/availableFeatures`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    const info = res.headers.get("x-powerbi-error-info");
    return {
      ok: false,
      message: info ? `Power BI rejected the token: ${info}` : `Power BI returned ${res.status}`,
    };
  },
};

export default oauth2;
