import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. Register a Client at
 * https://www.patreon.com/portal/registration/register-clients, store the
 * resulting `client_id` + `client_secret` + `redirect_uri` on the w6w server,
 * and end users then connect via the browser authorization dance.
 *
 * Verified against docs.patreon.com's own "OAuth" walkthrough (Steps 1-7):
 *   - Authorization endpoint: https://www.patreon.com/oauth2/authorize
 *     (`response_type=code&client_id=...&redirect_uri=...&scope=...&state=...`)
 *   - Token endpoint:         https://www.patreon.com/api/oauth2/token
 *     (`grant_type=authorization_code`, form-encoded body, needs
 *     `client_id`+`client_secret`+`redirect_uri`+`code`)
 *   - Refresh uses the SAME token endpoint with `grant_type=refresh_token`.
 *   - The docs never mention PKCE (no `code_challenge`/`code_verifier` anywhere
 *     in the reference), and the token exchange is a confidential-client flow
 *     requiring `client_secret` — so PKCE is disabled here rather than left at
 *     this framework's `true` default, which would add a `code_challenge`
 *     Patreon's authorize endpoint does not document support for.
 *   - Scopes are space-separated (Patreon's own example URL uses the default
 *     `scope=` query param format, i.e. this framework's default separator).
 *
 * Scope note from the docs: during authorization Patreon APPENDS newly
 * requested scopes to whatever the user already approved rather than
 * replacing them, so a client should always request the full set it needs.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Patreon)",
  description: "Public OAuth flow. Requires a Patreon Client registered at " +
    "patreon.com/portal/registration/register-clients (client_id / client_secret / " +
    "redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.full_name}}",
  oauth2: {
    authorizationUrl: "https://www.patreon.com/oauth2/authorize",
    tokenUrl: "https://www.patreon.com/api/oauth2/token",
    // Not documented anywhere in Patreon's OAuth reference; the flow requires
    // a client_secret, so this is a confidential-client grant, not a PKCE one.
    pkce: false,
    scopes: [
      "identity",
      "identity[email]",
      "identity.memberships",
      "campaigns",
      "campaigns.members",
      "campaigns.members[email]",
      "campaigns.members.address",
      "campaigns.posts",
      "w:campaigns.webhook",
    ],
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/identity`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => undefined) as
        | { errors?: Array<{ detail?: string; title?: string }> }
        | undefined;
      const detail = body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title;
      return {
        ok: false,
        message: detail ? `Patreon: ${detail}` : `Patreon returned ${res.status}`,
      };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/identity?fields%5Buser%5D=full_name,email`);
    if (!res.ok) return {};
    const body = await res.json() as {
      data?: { id?: string; attributes?: { full_name?: string; email?: string } };
    };
    const user = body.data?.attributes ?? {};
    return {
      user: {
        id: body.data?.id,
        full_name: user.full_name,
        email: user.email,
      },
    };
  },
};

export default oauth2;
