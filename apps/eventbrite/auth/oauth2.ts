import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. You register an app
 * on Eventbrite (Account Settings → App Management → Create a new app),
 * store the resulting `client_id` + `client_secret` + `redirect_uri` on the
 * w6w server via PUT /apps/:id/oauth-config/oauth2, and end users then
 * connect via the browser authorization dance.
 *
 * Until the exchange hook is wired up, the studio's /apps/:id/auths endpoint
 * hides this method entirely unless an `app_oauth_config` row exists for it.
 * That way the connection picker never offers something that would fail.
 *
 * Eventbrite specifics:
 *   - No fine-grained scopes: tokens are user-level, all-or-nothing.
 *   - Uses `code` flow (no PKCE support server-side, so pkce=false).
 *   - Token endpoint is form-encoded — the exchange hook (to be written)
 *     posts `grant_type=authorization_code&client_id=…&client_secret=…&code=…&redirect_uri=…`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Eventbrite)",
  description:
    "Public OAuth flow. Requires an Eventbrite app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://www.eventbrite.com/oauth/authorize",
    tokenUrl: "https://www.eventbrite.com/oauth/token",
    // Eventbrite doesn't support incremental scopes — leaving `scopes` unset
    // maps to the token's full account access.
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/users/me/`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Eventbrite returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me/`);
    if (!res.ok) return {};
    const user = await res.json() as {
      id?: string;
      name?: string;
      emails?: Array<{ email: string }>;
    };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.emails?.[0]?.email,
      },
    };
  },
};

export default oauth2;
