import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. You register a Google
 * OAuth 2.0 client (Google Cloud Console → APIs & Services → Credentials),
 * store the resulting `client_id` + `client_secret` + `redirect_uri` on the
 * w6w server via PUT /apps/:id/oauth-config/oauth2, and end users then connect
 * via the browser authorization dance.
 *
 * Google specifics:
 *   - Fine-grained scopes; the default set is the minimum required by the
 *     actions in this app (modify + send).
 *   - Uses `code` flow with PKCE support (default on).
 *   - `access_type=offline&prompt=consent` needed to receive a refresh token —
 *     added via `extraAuthParams` so the runtime forwards them on the initial
 *     authorization redirect.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google OAuth 2.0 client (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    pkce: true,
    // Google issues refresh tokens only when both are set on the initial grant.
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
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
    const res = await ctx.fetch(`${API_URL}/users/me/profile`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Gmail returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me/profile`);
    if (!res.ok) return {};
    const profile = await res.json() as { emailAddress?: string };
    return {
      user: {
        email: profile.emailAddress,
        name: profile.emailAddress,
      },
    };
  },
};

export default oauth2;
