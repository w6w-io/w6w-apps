import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — VideoAsk's only documented third-party auth flow.
 *
 * Verified against the vendor's own Postman collection "Authentication"
 * folder (fetched 2026-08-30) and live probes against `api.videoask.com` the
 * same day.
 *
 * ## Endpoints, confirmed from the collection
 *
 *  - Authorize: `GET https://auth.videoask.com/authorize` — the collection's
 *    worked example is
 *    `?response_type=code&audience=https://api.videoask.com/&client_id=…&scope=openid%20profile%20email&redirect_uri=…`.
 *    `audience` is required — VideoAsk's `auth.videoask.com` is an Auth0
 *    tenant, and without it Auth0 mints an ID token rather than an API access
 *    token — so it is sent via `extraAuthParams` rather than left to a
 *    default.
 *  - Token: `POST https://auth.videoask.com/oauth/token`, form-urlencoded body
 *    `grant_type=authorization_code&code=…&client_id=…&client_secret=…&redirect_uri=…`
 *    — the standard shape, so no custom `exchange` hook is needed.
 *  - Refresh: the SAME `POST https://auth.videoask.com/oauth/token`, body
 *    `grant_type=refresh_token&refresh_token=…&client_id=…&client_secret=…` —
 *    also the standard shape, so no custom `refresh` hook is needed either.
 *    A refresh token is only issued when the authorize request carried the
 *    `offline_access` scope, which is why it is requested by default below.
 *  - `auth.videoask.com` and `api.videoask.com` are two different hosts. The
 *    OAuth endpoint host is allowed implicitly by the runtime; `network.allow`
 *    in `package.json` only needs the API host.
 *
 * ## Why `/me` is the probe, not `/organizations`
 *
 * `GET /me` returns `{user_id, username, email, terms_and_conditions,
 * marketing_communications_opt_in, tailored_experience_opt_in,
 * third_parties_data_opt_in, created_at}` — confirmed against the vendor's own
 * example response. Nothing there is a credential, so it is safe both as the
 * liveness probe and as the display-label source. `/organizations` would work
 * too, but a lone account with no additional organizations still answers with
 * itself, so `/me` is the narrower, always-populated choice.
 */

export interface VideoAskCredential {
  accessToken: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with VideoAsk)",
  description: "Public OAuth flow. Requires a VideoAsk Developer App registration (client_id / " +
    "client_secret / redirect_uri, from Organization Settings > Developer Apps) configured on " +
    "this w6w installation.",
  connectionLabel: "VideoAsk ({{username}})",
  oauth2: {
    authorizationUrl: "https://auth.videoask.com/authorize",
    tokenUrl: "https://auth.videoask.com/oauth/token",
    // offline_access is what makes VideoAsk hand back a refresh_token — without
    // it a Connection would stop working the moment the access token expires.
    scopes: ["openid", "profile", "email", "offline_access"],
    pkce: true,
    // Required by the Auth0 tenant behind auth.videoask.com to mint an API
    // access token rather than an ID-token-only response — see the module doc.
    extraAuthParams: { audience: `${API_BASE}/` },
  },

  sign({ request, credential }) {
    const { accessToken } = credential as Partial<VideoAskCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as Partial<VideoAskCredential>;
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { detail?: string } | null;
    if (res.status === 401) {
      return {
        ok: false,
        message: `VideoAsk rejected the access token (401${
          body?.detail ? `: ${body.detail}` : ""
        }). Reconnect this connection.`,
      };
    }
    return {
      ok: false,
      message: `VideoAsk returned HTTP ${res.status} for /me${
        body?.detail ? `: ${body.detail}` : ""
      }`,
    };
  },

  /** Publish the account's username — the field the connect screen's label template reads. */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as Partial<VideoAskCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${accessToken ?? ""}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as { username?: string; user_id?: string; email?: string };
      if (!body?.username) return {};
      return { username: body.username, userId: body.user_id, email: body.email };
    } catch {
      return {};
    }
  },
};

export default oauth2;
