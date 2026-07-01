import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Public OAuth 2.0 (`oauth2`) — the "public integrator" path. You register a
 * HubSpot public app (Developer Account → Apps → Create app), store the
 * resulting `client_id` + `client_secret` + `redirect_uri` on the w6w server
 * via PUT /apps/:id/oauth-config/oauth2, and end users then connect via the
 * browser authorization dance.
 *
 * HubSpot specifics:
 *   - Fine-grained scopes; the default set mirrors n8n's HubspotOAuth2Api
 *     credential so a workflow ported from n8n keeps working.
 *   - Uses `code` flow with PKCE support (we default to on).
 *   - Refresh tokens are long-lived and rotate on refresh; the runtime's
 *     built-in `refresh` handler POSTs to the token endpoint.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with HubSpot)",
  description:
    "Public OAuth flow. Requires a HubSpot public app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{portal.name}} ({{portal.id}})",
  oauth2: {
    authorizationUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    // Scope set taken verbatim from n8n's HubspotOAuth2Api credential so ports
    // work out of the box. App owners can override this on the server-side
    // OAuth config when they need broader/narrower access.
    scopes: [
      "crm.lists.write",
      "crm.objects.contacts.read",
      "crm.objects.contacts.write",
      "crm.objects.companies.read",
      "crm.objects.companies.write",
      "crm.objects.deals.read",
      "crm.objects.deals.write",
      "crm.objects.owners.read",
      "crm.schemas.companies.read",
      "crm.schemas.contacts.read",
      "crm.schemas.deals.read",
      "forms",
      "tickets",
    ],
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/crm/v3/objects/contacts?limit=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `HubSpot returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/account-info/v3/details`);
    if (!res.ok) return {};
    const info = await res.json() as {
      portalId?: number;
      uiDomain?: string;
      companyName?: string;
    };
    return {
      portal: {
        id: info.portalId,
        name: info.companyName ?? info.uiDomain ?? `Portal ${info.portalId}`,
      },
    };
  },
};

export default oauth2;
