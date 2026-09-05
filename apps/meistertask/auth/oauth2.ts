import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator, many end users" path.
 *
 * Verified 2026-09-05 against
 * https://developers.mindmeister.com/docs/oauth-2 (linked from MeisterTask's
 * own authentication page, which states explicitly: "The MeisterTask API
 * currently uses MindMeister's back end systems for OAuth 2.0 application and
 * user management"). The endpoints below are MindMeister's, not
 * MeisterTask's own — a resulting access token is presented to
 * `www.meistertask.com/api` the same way, over `Authorization: Bearer`.
 *
 * - Authorization endpoint: https://www.mindmeister.com/oauth2/authorize
 * - Token endpoint:         https://www.mindmeister.com/oauth2/token
 * - Grant type: `authorization_code`. The vendor's own docs describe the
 *   exchange as form-encoded client credentials in the request body
 *   (`client_id`, `client_secret`, `code`, `redirect_uri`,
 *   `grant_type=authorization_code`) with no mention of PKCE, so `pkce` is
 *   left off rather than assumed.
 * - `expires_in` is documented as optional — a token issued without it "does
 *   not expire by time" and can only be revoked manually. No `refresh` hook
 *   is declared here: the vendor's response format never guarantees a
 *   `refresh_token`, and this app has not verified one is issued.
 *
 * The three scopes MeisterTask's own docs say are required:
 * `userinfo.profile`, `userinfo.email` and `meistertask`.
 *
 * OAuth endpoint hosts are allowed implicitly by the runtime, so
 * `www.mindmeister.com` is not restated in `package.json`'s `network.allow`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with MindMeister)",
  description:
    "Public OAuth flow, delegated through MindMeister's authorization server (MeisterTask " +
    "shares its account backend). Requires an OAuth client registered with MindMeister " +
    "(client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{firstname}} {{lastname}} ({{email}})",
  oauth2: {
    authorizationUrl: "https://www.mindmeister.com/oauth2/authorize",
    tokenUrl: "https://www.mindmeister.com/oauth2/token",
    scopes: ["userinfo.profile", "userinfo.email", "meistertask"],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /** Same probe as the personal-access-token method — see its comment for why. */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}/persons/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) {
      return { ok: false, message: "MeisterTask rejected the access token (401)." };
    }
    return { ok: false, message: `MeisterTask returned HTTP ${res.status} for /persons/me` };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    try {
      const res = await ctx.fetch(`${API_BASE}/persons/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${accessToken ?? ""}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        id?: number;
        firstname?: string;
        lastname?: string;
        email?: string;
      };
      if (!body?.email && !body?.firstname) return {};
      return {
        id: body.id,
        firstname: body.firstname,
        lastname: body.lastname,
        email: body.email,
      };
    } catch {
      return {};
    }
  },
};

export default oauth2;
