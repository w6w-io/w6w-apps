import type { AuthDefinition } from "@w6w/types";
import { ACCEPT_HEADER, API_BASE } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path: one Unbounce OAuth
 * application registered ahead of time, many end users authorizing it.
 *
 * Verified against `developer.unbounce.com/getting_started/#oauth` (fetched
 * 2026-08-30):
 *   - Authorize URL: `https://api.unbounce.com/oauth/authorize`
 *   - Token URL: `https://api.unbounce.com/oauth/token`
 *   - Both endpoints live on the API host itself, so `network.allow` needs no
 *     separate entry for them.
 *   - The token exchange is `client_secret`-based with no `code_verifier`
 *     parameter documented, so PKCE is not a supported option here; `pkce` is
 *     set `false` (the spec's own default is `true`).
 *   - **Single fixed scope**, `full` — the doc states plainly "Currently only
 *     (default) scope: 'full' is supported. Which provides access based on the
 *     user's credentials", so there is nothing narrower to request.
 *   - The token response documents its own `refresh_token` and `expires_in`
 *     (600 seconds in the vendor's example), and a dedicated refresh recipe
 *     posting `grant_type=refresh_token` to the same token URL — so
 *     `refreshUrl` is left to default to `tokenUrl` rather than restated.
 *
 * This is also the credential Unbounce requires for the two lead-deletion
 * endpoints an API key cannot reach — see `../auth/api-key.ts`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Unbounce)",
  description:
    "Public OAuth flow. Requires an Unbounce OAuth application (client_id / client_secret / " +
    "redirect_uri) registered on this w6w installation. Unlike the API Key method, this " +
    "credential can also delete leads.",
  connectionLabel: "Unbounce ({{email}})",
  oauth2: {
    authorizationUrl: "https://api.unbounce.com/oauth/authorize",
    tokenUrl: "https://api.unbounce.com/oauth/token",
    scopes: ["full"],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    request.headers["accept"] ??= ACCEPT_HEADER;
    return request;
  },

  /** Same probe as the API Key method — see `../auth/api-key.ts` for why `/users/self`. */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}/users/self`, {
      headers: { accept: ACCEPT_HEADER, authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Unbounce rejected the access token (${res.status}) for /users/self.`,
      };
    }
    return { ok: false, message: `Unbounce returned HTTP ${res.status} for /users/self` };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    try {
      const res = await ctx.fetch(`${API_BASE}/users/self`, {
        headers: { accept: ACCEPT_HEADER, authorization: `Bearer ${accessToken ?? ""}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as { email?: string; id?: string };
      if (!body?.email) return {};
      return { email: body.email, userId: body.id };
    } catch {
      return {};
    }
  },
};

export default oauth2;
