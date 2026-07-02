import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. You register a Dropbox
 * app in the App Console, store its `client_id` + `client_secret` +
 * `redirect_uri` on the w6w server via PUT /apps/:id/oauth-config/oauth2, and
 * end users then connect via the browser authorization dance.
 *
 * Dropbox specifics:
 *   - Uses fine-grained scopes (assigned on the app itself in the App Console);
 *     the default set below is the minimum for the actions in this app.
 *   - `token_access_type=offline` on the authorize URL is required for Dropbox
 *     to include a refresh token in the exchange response. Without it you get
 *     a short-lived access token (~4 hours) and no way to refresh.
 *   - PKCE is supported; we keep the runtime default (on).
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Dropbox)",
  description:
    "Public OAuth flow. Requires a Dropbox app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scopes: [
      "files.content.write",
      "files.content.read",
      "sharing.read",
      "account_info.read",
    ],
    extraAuthParams: {
      // Required — without this Dropbox omits the refresh token from the
      // exchange response and the access token expires in ~4 hours.
      token_access_type: "offline",
    },
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/users/get_current_account`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Dropbox returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/get_current_account`, {
      method: "POST",
    });
    if (!res.ok) return {};
    const account = await res.json() as {
      account_id?: string;
      name?: { display_name?: string };
      email?: string;
    };
    return {
      user: {
        id: account.account_id,
        name: account.name?.display_name,
        email: account.email,
      },
    };
  },
};

export default oauth2;
