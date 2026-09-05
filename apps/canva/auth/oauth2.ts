import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 Authorization Code flow with PKCE (S256) — the only auth model
 * Canva Connect publishes. Verified 2026-09-05 against
 * https://www.canva.dev/docs/connect/authentication/ and the paired
 * api-reference pages:
 *
 *  - Authorize at `https://www.canva.com/api/oauth/authorize` (note: the
 *    marketing host, `www.canva.com` — NOT `api.canva.com`). Canva requires
 *    `code_challenge_method=s256`; this app relies on the host's standard
 *    PKCE implementation to generate the verifier/challenge pair.
 *  - Exchange and refresh both hit the same endpoint,
 *    `POST https://api.canva.com/rest/v1/oauth/token`, distinguished only by
 *    `grant_type`. The client authenticates with HTTP Basic
 *    (`base64(client_id:client_secret)`) — handled host-side, never by this
 *    package.
 *  - Revocation is a separate endpoint, `POST /rest/v1/oauth/revoke`.
 *  - Access tokens are short-lived: 4 hours as of this writing, and the
 *    endpoint documents that figure as subject to change without notice —
 *    so a workflow must not assume any particular lifetime and should rely
 *    on the host's `refresh` handling rather than caching a token.
 *
 * Canva scopes access tightly per action (see `appendix/scopes/`) — a scope
 * not listed here isn't just unused, it's actively refused: the vendor's own
 * guidance is "you must be explicit... asset:write doesn't grant
 * asset:read". The list below is the union of every scope this app's
 * actions declare.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Connect Canva)",
  description: "Public OAuth flow with PKCE. Requires a Canva integration registered in the " +
    "Canva Developer Portal (https://www.canva.com/developers/).",
  connectionLabel: "{{user.display_name}}",
  oauth2: {
    authorizationUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: `${API_URL}/rest/v1/oauth/token`,
    refreshUrl: `${API_URL}/rest/v1/oauth/token`,
    revokeUrl: `${API_URL}/rest/v1/oauth/revoke`,
    scopes: [
      "design:meta:read",
      "design:content:read",
      "design:content:write",
      "folder:read",
      "folder:write",
      "asset:read",
      "asset:write",
      "brandtemplate:meta:read",
      "brandtemplate:content:read",
      "profile:read",
    ],
    scopeSeparator: " ",
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v1/users/me` requires a valid token and NO specific scope — the
   * narrowest possible probe, reachable regardless of which scopes the user
   * actually granted. Its response is just `{ team_user: { user_id, team_id } }`,
   * so unlike `/v1/users/me/profile` (needs `profile:read`) this can't fail a
   * legitimately-scoped-down connection, and unlike a design/folder/asset
   * read it never risks echoing back the caller's own content.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/rest/v1/users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { code?: string; message?: string };
      return { ok: false, message: body.message ?? `Canva returned ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * `profile:read` is a distinct, optional scope — the connection may not
   * have it, so a missing/failed profile fetch is not itself an error, just
   * a connection with no display name.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/rest/v1/users/me/profile`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as { profile?: { display_name?: string } };
    return { user: { display_name: body.profile?.display_name } };
  },
};

export default oauth2;
