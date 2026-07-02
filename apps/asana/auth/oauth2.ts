import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. You register an app
 * at https://app.asana.com/0/my-apps, store the resulting
 * `client_id` + `client_secret` + `redirect_uri` on the w6w server, and end
 * users then connect via the browser authorization dance.
 *
 * Asana specifics (mirrors n8n's `AsanaOAuth2Api.credentials.ts`):
 *   - Authorization endpoint: https://app.asana.com/-/oauth_authorize
 *   - Token endpoint:         https://app.asana.com/-/oauth_token
 *   - Grant type is `authorization_code`. n8n's credential does not enable
 *     PKCE and Asana's spec is opt-in, so we default `pkce: false` here.
 *     Toggle to `true` per-installation if the app registration opts in.
 *   - Token exchange is form-encoded in the request body (n8n sets
 *     `authentication: 'body'`) — the runtime's exchange helper posts
 *     `grant_type=authorization_code&client_id=…&client_secret=…&code=…&redirect_uri=…`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Asana)",
  description:
    "Public OAuth flow. Requires an Asana developer app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://app.asana.com/-/oauth_authorize",
    tokenUrl: "https://app.asana.com/-/oauth_token",
    // n8n's Asana OAuth2 credential leaves the base `oAuth2Api` PKCE toggle
    // unset (default off) and Asana's OAuth spec treats PKCE as opt-in.
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
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Asana returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return {};
    const body = await res.json() as {
      data?: { gid?: string; name?: string; email?: string };
    };
    const user = body.data ?? {};
    return {
      user: {
        id: user.gid,
        name: user.name,
        email: user.email,
      },
    };
  },
};

export default oauth2;
