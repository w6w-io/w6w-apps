import type { AuthDefinition } from "@w6w/types";

const ME_URL = "https://api.freeagent.com/v2/users/me";

/**
 * OAuth 2.0 with a FreeAgent app, confirmed against `dev.freeagent.com/docs/oauth`.
 *
 * Two things about FreeAgent's flow are worth flagging because they diverge
 * from the OAuth2 apps elsewhere in this pack:
 *
 *   - **The refresh response rotates the refresh token.** FreeAgent's own
 *     example response to `grant_type=refresh_token` returns a NEW
 *     `refresh_token` alongside the new access token, not just a new access
 *     token with the same refresh token (the pattern most OAuth2 providers —
 *     Xero, HubSpot, Salesforce — follow). A refresh implementation that
 *     discards the response's `refresh_token` and reuses the old one will
 *     work right up until the old one is invalidated server-side, then fail
 *     in a way that looks like an unrelated outage. No custom `refresh` hook
 *     is written here because this app's host's built-in default refresh
 *     handler already persists whatever the token endpoint returns — this is
 *     called out for anyone tempted to special-case it.
 *   - **Access tokens last exactly ONE hour** (not FreeAgent's fifteen-minute
 *     authorization code — that is a separate, shorter-lived value spent
 *     immediately in the token exchange). Both numbers are stated explicitly
 *     in the OAuth doc; conflating them under-estimates how often a workflow
 *     mid-run will need `refresh` to fire.
 *
 * `redirect_uri` legitimately varies per registered app rather than being
 * fixed by this file, so it is left to the host's standard OAuth2 redirect
 * handling rather than hardcoded here.
 *
 * No `revokeUrl` is set: FreeAgent's docs (oauth, rotating_client_secrets)
 * document no token-revocation endpoint of any kind.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with FreeAgent)",
  description: "Public OAuth flow. Requires a FreeAgent app registered on this w6w installation.",
  connectionLabel: "{{userEmail}}",
  oauth2: {
    authorizationUrl: "https://api.freeagent.com/v2/approve_app",
    tokenUrl: "https://api.freeagent.com/v2/token_endpoint",
    refreshUrl: "https://api.freeagent.com/v2/token_endpoint",
    scopes: [],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  // `ctx.fetch` is documented as unsigned for every auth-phase hook other
  // than `sign` itself (Hook Runtime RFC, sandbox posture table), so the
  // Authorization header is set by hand here rather than assuming the
  // runtime has already run `sign`.
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(ME_URL, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `FreeAgent returned ${res.status}` };
    const body = await res.json().catch(() => ({})) as { user?: { email?: string } };
    if (!body.user?.email) return { ok: false, message: "response carried no user" };
    return { ok: true };
  },

  /**
   * Records the connected user's email for display, without ever handing an
   * action anything more than that label. `/v2/users/me` needs only the
   * lowest access level ("Time"), so it works for a narrowly-scoped token.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    const res = await ctx.fetch(ME_URL, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      user?: { email?: string; first_name?: string; last_name?: string };
    };
    if (!body.user?.email) return {};
    return {
      userEmail: body.user.email,
      userName: [body.user.first_name, body.user.last_name].filter(Boolean).join(" "),
    };
  },
};

export default oauth2;
