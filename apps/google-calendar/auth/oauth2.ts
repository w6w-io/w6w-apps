import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 — the "public integrator" path. You register an app in the Google
 * Cloud Console, enable the Google Calendar API, store the resulting
 * `client_id` + `client_secret` + `redirect_uri` on the w6w server, and end
 * users then connect via the browser authorization dance. Google requires
 * `access_type=offline` + `prompt=consent` to reliably hand back a refresh
 * token on every consent.
 *
 * Scopes mirror n8n's GoogleCalendarOAuth2Api: full calendar + events access.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Google Calendar API enabled and OAuth client credentials configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
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
    // `calendarList` is the cheapest read that proves the calendar scope is
    // present — a plain `oauth2/v2/userinfo` would succeed even without it.
    const res = await ctx.fetch(`${API_URL}/users/me/calendarList?maxResults=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Google Calendar returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    // The `primary` calendar's owner is a reasonable proxy for the connected
    // user; Calendar API doesn't expose a dedicated "me" endpoint the way
    // Drive does.
    const res = await ctx.fetch(`${API_URL}/calendars/primary`);
    if (!res.ok) return {};
    const cal = await res.json() as {
      id?: string;
      summary?: string;
      timeZone?: string;
    };
    return {
      user: {
        id: cal.id,
        name: cal.summary,
        email: cal.id,
      },
      timeZone: cal.timeZone,
    };
  },
};

export default oauth2;
