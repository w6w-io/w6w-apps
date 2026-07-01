import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Legacy API Key (`apiKey`) — **DEPRECATED**. HubSpot retired API-key auth
 * on 30 November 2022 and stopped accepting new keys, but existing keys on
 * grandfathered accounts still work. This method is kept for backwards
 * compatibility only; new integrations should use the Private App Token
 * method instead (see `./private-app-token.ts`).
 *
 * The credential travels as `?hapikey=<key>` on every request — the runtime
 * appends the query param automatically via the `apiKey` config below.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key (Deprecated)",
  description:
    "HubSpot retired API keys on 30 November 2022 and only legacy accounts still accept them. Use the Private App Token method for new integrations.",
  connectionLabel: "{{portal.name}} ({{portal.id}})",
  apiKey: { in: "query", name: "hapikey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Deprecated. Kept only for grandfathered accounts.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    // HubSpot rejects blank/missing values with 401, so we mirror the runtime's
    // built-in apiKey-in-query wiring here too for callers that call sign()
    // directly (tests, custom hosts).
    const url = new URL(request.url);
    url.searchParams.set("hapikey", key);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey: string };
    const url = new URL(`${API_URL}/crm/v3/objects/contacts`);
    url.searchParams.set("limit", "1");
    url.searchParams.set("hapikey", key);
    const res = await ctx.fetch(url.toString());
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

export default apiKey;
