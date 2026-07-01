import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 — the "public integrator" path. You register an app in the Google
 * Cloud Console, store the resulting `client_id` + `client_secret` + `redirect_uri`
 * on the w6w server, and end users then connect via the browser authorization
 * dance. Google requires `access_type=offline` + `prompt=consent` to reliably
 * receive a refresh token on every consent.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Google Drive API enabled and OAuth client credentials configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: ["https://www.googleapis.com/auth/drive"],
    // Google needs these on the authorize URL to hand back a refresh_token.
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
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
    const res = await ctx.fetch(`${API_URL}/about?fields=user`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Google Drive returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/about?fields=user`);
    if (!res.ok) return {};
    const data = await res.json() as {
      user?: { displayName?: string; emailAddress?: string; permissionId?: string };
    };
    const user = data.user ?? {};
    return {
      user: {
        id: user.permissionId,
        name: user.displayName,
        email: user.emailAddress,
      },
    };
  },
};

export default oauth2;
