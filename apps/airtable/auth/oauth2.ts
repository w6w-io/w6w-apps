import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. You register an app on
 * Airtable (https://airtable.com/create/oauth), store the resulting
 * `client_id` / `client_secret` / `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2, and end users then connect via the
 * browser authorization dance.
 *
 * Airtable specifics:
 *   - **PKCE is required** for public clients (and works for confidential too).
 *   - Scopes are fine-grained (e.g. `data.records:read`, `schema.bases:read`).
 *     The default set below matches this app's needs; the studio can override
 *     via the OAuth config.
 *   - Access tokens expire after 60 minutes; refresh tokens after 60 days.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Airtable)",
  description:
    "Public OAuth flow. Requires an Airtable OAuth integration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.email}}",
  oauth2: {
    authorizationUrl: "https://airtable.com/oauth2/v1/authorize",
    tokenUrl: "https://airtable.com/oauth2/v1/token",
    refreshUrl: "https://airtable.com/oauth2/v1/token",
    scopes: [
      "data.records:read",
      "data.records:write",
      "schema.bases:read",
    ],
    scopeSeparator: " ",
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
    const res = await ctx.fetch(`${API_URL}/meta/whoami`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Airtable returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/meta/whoami`);
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; email?: string; scopes?: string[] };
    return {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  },
};

export default oauth2;
