import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Private App Token (`bearer`) — HubSpot's modern standard for server-to-server
 * access. You create a Private App inside a HubSpot account (Settings →
 * Integrations → Private Apps), assign scopes, and paste the generated token.
 * Every request signs with `Authorization: Bearer <token>`.
 *
 * For the "public integrator" path (browser OAuth flow, one HubSpot app
 * marketplace listing, many end users) see `./oauth2.ts`. For the deprecated
 * API-key flow (retired by HubSpot in 2022 but still accepted on some
 * legacy accounts) see `./api-key.ts`.
 */
const privateAppToken: AuthDefinition = {
  key: "private-app-token",
  type: "bearer",
  displayName: "Private App Token",
  description:
    "Paste a private app access token minted at Settings → Integrations → Private Apps. Recommended for server-to-server automations.",
  connectionLabel: "{{portal.name}} ({{portal.id}})",
  fields: [
    {
      key: "apiKey",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "HubSpot: Settings → Integrations → Private Apps → your app → Auth tab → Access token.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    // /crm/v3/objects/contacts?limit=1 is scoped by every private app that has
    // *any* CRM read permission, so it's the cheapest probe that verifies both
    // the token and (indirectly) that scopes are wired up.
    const res = await ctx.fetch(`${API_URL}/crm/v3/objects/contacts?limit=1`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `HubSpot returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    // account-info/v3/details returns the portal (HubSpot's word for "hub" /
    // tenant): { portalId, uiDomain, dataHostingLocation, ... }. We derive a
    // human label from it — HubSpot does not expose a per-user identity for
    // private-app tokens.
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

export default privateAppToken;
