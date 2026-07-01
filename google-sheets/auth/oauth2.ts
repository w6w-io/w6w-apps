import type { AuthDefinition } from "@w6w/types";
import { SHEETS_API } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "sign in with Google" path. You register an app
 * in Google Cloud Console (APIs & Services → Credentials → OAuth client ID),
 * enable the Google Sheets API + Google Drive API, then store the
 * `client_id` / `client_secret` / `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2. End users then connect via the browser
 * authorization dance.
 *
 * Google specifics:
 *   - Two scopes: `spreadsheets` (read+write cell/sheet data) and `drive.file`
 *     (create + access files this app touches — needed for `spreadsheet-create`
 *     / `spreadsheet-delete`).
 *   - `access_type=offline` + `prompt=consent` on the authorize URL so we
 *     always receive a refresh token, even for returning users. Without these
 *     Google silently omits `refresh_token` on subsequent grants.
 *   - PKCE off: server-side app; the client secret is the trust anchor.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud OAuth 2.0 client (client_id / client_secret / redirect_uri) configured on this w6w installation, with the Google Sheets and Drive APIs enabled.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
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
    // No trivial GET-me endpoint for Sheets — validate the token itself with
    // Google's public tokeninfo introspection endpoint.
    const res = await ctx.fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) return { ok: false, message: `Google returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    // Google's `userinfo` endpoint (via the OpenID scopes) isn't in our default
    // scopes, so we don't have a `user.name`/`email` to fill `connectionLabel`.
    // Callers can override connectionLabel or extend scopes; keep the hook so
    // the wiring point stays visible.
    const res = await ctx.fetch("https://openidconnect.googleapis.com/v1/userinfo");
    if (!res.ok) return {};
    const user = await res.json() as { sub?: string; name?: string; email?: string };
    return {
      user: { id: user.sub, name: user.name, email: user.email },
    };
  },
};

export default oauth2;

// Re-exported so tests can assert against the same constant the client uses.
export { SHEETS_API };
