import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "sign in with Discord" path. You register a
 * Discord Application (Discord Developer Portal → Applications → OAuth2),
 * store the resulting `client_id` + `client_secret` + `redirect_uri` on the
 * w6w server via PUT /apps/:id/oauth-config/oauth2, and end users then connect
 * via the browser authorization dance.
 *
 * Discord specifics:
 *   - Fine-grained scopes; the defaults match n8n's Discord OAuth2 credential:
 *     identify + guilds + guilds.join + bot. `guilds.members.read` is added
 *     because our member operations need it.
 *   - Uses `code` flow with PKCE (Discord supports it).
 *   - Endpoints live under discord.com/api/oauth2/*.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Discord)",
  description:
    "Public OAuth flow. Requires a Discord Application (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.username}}",
  oauth2: {
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: [
      "identify",
      "guilds",
      "guilds.join",
      "guilds.members.read",
      "bot",
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
    const res = await ctx.fetch(`${API_URL}/users/@me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Discord returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/@me`);
    if (!res.ok) return {};
    const user = await res.json() as {
      id?: string;
      username?: string;
      global_name?: string;
    };
    return {
      user: {
        id: user.id,
        username: user.global_name ?? user.username,
      },
    };
  },
};

export default oauth2;
