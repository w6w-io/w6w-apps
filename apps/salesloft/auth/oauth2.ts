import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (authorization code) with a Salesloft OAuth application. The
 * client_id / client_secret / redirect_uri live on the w6w server, not in
 * this package. Registered under
 * https://accounts.salesloft.com/oauth/applications; required for anyone
 * building a partner integration rather than automating their own account
 * (that path is `auth/api-key.ts`).
 *
 * Endpoint hosts and the full scope list are verified against
 * developers.salesloft.com/docs/api/salesloft-platform (the "Authentication"
 * section of the v2 API introduction, which renders server-side and lists
 * every scope literally). `accounts.salesloft.com` is a different host from
 * the `api.salesloft.com` egress allowlist; OAuth endpoint hosts are
 * allow-listed implicitly by the host runtime, so it is not (and must not be)
 * restated in `network.allow`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Salesloft)",
  description:
    "Public OAuth flow. Requires a Salesloft OAuth application registered on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://accounts.salesloft.com/oauth/authorize",
    tokenUrl: "https://accounts.salesloft.com/oauth/token",
    // Trimmed to the scopes this app's actions actually need (people,
    // accounts, cadences, cadence memberships live under crm/cadences,
    // calls, tasks, notes) rather than the full ~40-scope catalogue
    // Salesloft's OAuth app registration exposes.
    scopes: [
      "people:read",
      "people:write",
      "people:delete",
      "accounts:read",
      "accounts:write",
      "accounts:delete",
      "cadences:read",
      "cadences:write",
      "crm:read",
      "crm:write",
      "calls:read",
      "calls:write",
      "tasks:read",
      "tasks:write",
      "tasks:delete",
      "notes:read",
      "notes:write",
      "notes:delete",
      "team:read",
    ],
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
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Salesloft returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { name?: string; email?: string };
    };
    const me = body.data ?? {};
    return { user: { name: me.name ?? me.email ?? "Salesloft user", email: me.email } };
  },
};

export default oauth2;
