import type { AuthDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";

/**
 * OAuth 2.0 Authorization Code flow — the only user-context auth Pinterest's
 * v5 API documents (`pinterest_oauth2` security scheme in the OpenAPI
 * description). `client_id` / `client_secret` / `redirect_uri` live on the
 * w6w server (PUT /apps/:id/oauth-config/oauth2), not in this package.
 *
 * Verified 2026-08-29 against Pinterest's OpenAPI description
 * (`securitySchemes.pinterest_oauth2`) and an archived snapshot of Pinterest's
 * own "Set up authentication and authorization" guide (`developers.pinterest.com`,
 * live rendering is a client-side app that returns no usable HTML to a plain
 * fetch, so the archived DOM was read instead):
 *
 *   - Authorize step: `https://www.pinterest.com/oauth/?client_id=…&redirect_uri=…
 *     &response_type=code&scope=…&state=…` — note the scope list in that
 *     example (`ads:read,ads:write,boards:read,pins:read`) is COMMA-separated,
 *     unlike LinkedIn/X's space-separated form. `scopeSeparator: ","` below is
 *     load-bearing, not cosmetic.
 *   - Token step: `POST https://api.pinterest.com/v5/oauth/token`, documented
 *     with `security: [{"basic": []}]` in the OpenAPI description and shown in
 *     the guide's own curl example sending `Authorization: Basic
 *     {base64(client_id:client_secret)}` — Pinterest does NOT accept
 *     client_id/client_secret in the token request body (`client_secret_post`).
 *     If connecting a Pinterest app ever fails at the token-exchange step, this
 *     is the first thing to check on the host's generic OAuth2 grant driver.
 *   - No PKCE anywhere in the guide or the OpenAPI description (no
 *     `code_challenge`/`code_verifier` field on any documented request), so
 *     `pkce` is explicitly `false` rather than left at the type's `true`
 *     default.
 *
 * Refresh: the same token endpoint accepts `grant_type=refresh_token`, so
 * `refreshUrl` equals `tokenUrl` — restated explicitly rather than left to
 * infer. Pinterest also documents a `continuous_refresh` request field:
 * apps activated before 2025-09-25 must pass `continuous_refresh=true` on the
 * *initial* token exchange to receive a refresh token that renews indefinitely
 * (60-day expiry, refreshable) rather than the retired 365-day one-shot form;
 * apps activated on or after that date get the continuous form automatically.
 * That is a one-time app-activation detail with no generic `oauth2` config
 * field to carry it, so it is documented here rather than encoded.
 *
 * Scopes: only the ones this app's actions actually use. Pinterest also
 * defines `boards:read_secret`, `boards:write_secret`, `pins:read_secret`,
 * `pins:write_secret`, `ads:write`, `catalogs:*`, `billing:*` and
 * `biz_access:*` — none of which any action here requests or needs, so none
 * are listed.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Pinterest)",
  description:
    "Authorization Code flow. Requires a Pinterest app (developers.pinterest.com) registered " +
    "on this w6w installation.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    refreshUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: [
      "boards:read",
      "boards:write",
      "pins:read",
      "pins:write",
      "user_accounts:read",
      "ads:read",
    ],
    scopeSeparator: ",",
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /v5/user_account` — the narrowest usable probe.
   *
   * It needs only `user_accounts:read`, the smallest scope this app requests,
   * so a Connection missing every write scope still passes. Its response
   * (`Account`: id, username, profile counts) carries no credential material —
   * unlike a "whoami" that echoes an API key, this is Pinterest's own account
   * metadata, never the token itself.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    try {
      await new PinterestClient(ctx).json(`/user_account`);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  async afterConnect(_input, ctx) {
    try {
      const account = await new PinterestClient(ctx).json<{ id?: string; username?: string }>(
        `/user_account`,
      );
      if (!account?.username) return {};
      return { user: { id: account.id, name: account.username } };
    } catch {
      return {};
    }
  },
};

export default oauth2;
