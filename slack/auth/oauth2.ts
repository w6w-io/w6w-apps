import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Default scopes ported verbatim from `SlackOAuth2Api.credentials.ts` — Slack's
 * OAuth v2 splits scopes into bot-app (`scope=`) and user (`user_scope=`) lists.
 * n8n only populates the user list and leaves `scope=` empty; we do the same
 * here so behavior matches the source integration.
 */
export const userScopes = [
  "channels:read",
  "channels:write",
  "channels:history",
  "chat:write",
  "files:read",
  "files:write",
  "groups:read",
  "groups:history",
  "im:read",
  "im:history",
  "mpim:read",
  "mpim:history",
  "reactions:read",
  "reactions:write",
  "stars:read",
  "stars:write",
  "usergroups:write",
  "usergroups:read",
  "users.profile:read",
  "users.profile:write",
  "users:read",
  "search:read",
];

export const botScopes: string[] = [];

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path via Slack's OAuth v2 flow.
 * Register a Slack app, configure client_id/client_secret/redirect_uri on the
 * w6w server, and end users connect through the browser dance.
 *
 * Slack specifics:
 *   - Distinguishes bot vs. user scopes; the access token used at runtime is
 *     `authed_user.access_token` (n8n's `IOAuth2Options.property`).
 *   - Uses PKCE-capable OAuth v2 (`https://slack.com/oauth/v2/authorize`).
 *   - Token endpoint is form-encoded.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Slack)",
  description:
    "Public OAuth flow. Requires a Slack app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{team.name}} ({{user.name}})",
  oauth2: {
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: userScopes,
    pkce: true,
    extraAuthParams: {
      // Slack v2 uses `user_scope` for user-level scopes; bot scopes go in `scope`.
      user_scope: userScopes.join(" "),
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
    const res = await ctx.fetch(`${API_URL}/auth.test`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Slack returned ${res.status}` };
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!data.ok) return { ok: false, message: data.error ?? "auth.test failed" };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/auth.test`, { method: "POST" });
    if (!res.ok) return {};
    const data = await res.json() as {
      ok?: boolean;
      user?: string;
      user_id?: string;
      team?: string;
      team_id?: string;
    };
    if (!data.ok) return {};
    return {
      user: { id: data.user_id, name: data.user },
      team: { id: data.team_id, name: data.team },
    };
  },
};

export default oauth2;
