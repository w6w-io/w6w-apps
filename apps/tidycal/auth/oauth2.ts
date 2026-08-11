import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";
import { PROBE_PATH } from "./personal-token.ts";

/**
 * OAuth 2.0 authorization code — the path for an integration that connects
 * *other people's* TidyCal accounts.
 *
 * TidyCal's reference names both endpoints explicitly:
 *
 *     Authorization URL: https://tidycal.com/oauth/authorize
 *     Access Token URL:  https://tidycal.com/oauth/token
 *
 * You register the client at Integrations → Advanced → "Manage API keys" →
 * "OAuth clients", store its `client_id` / `client_secret` / `redirect_uri` on
 * the w6w server, and end users then connect through the browser dance.
 *
 * ## What was verified live, and how
 *
 * The server is Laravel Passport, and its grant dispatch is observable without
 * any client at all. `POST https://tidycal.com/oauth/token` with only a
 * `grant_type` (measured 2026-08-11):
 *
 *   | `grant_type`         | response                                            |
 *   | -------------------- | --------------------------------------------------- |
 *   | `authorization_code` | `invalid_request` · hint "Check the `client_id`"     |
 *   | `refresh_token`      | `invalid_request` · hint "Check the `client_id`"     |
 *   | `client_credentials` | `invalid_request` · hint "Check the `client_id`"     |
 *   | `password`           | `unsupported_grant_type`                            |
 *   | `bogus_grant`        | `unsupported_grant_type`                            |
 *
 * A grant that reaches client validation is enabled; one that does not is not.
 * So `authorization_code` **and** `refresh_token` are live — which is what makes
 * `refreshUrl` below a measured fact rather than an assumption — and the
 * password grant is off. `GET /oauth/authorize` with a bogus client answers
 * `401 {"error":"invalid_client"}`, so that endpoint is real too.
 *
 * ## What is deliberately NOT declared
 *
 * - **`scopes`.** TidyCal documents no scope vocabulary for a general OAuth
 *   client. The only scope it names anywhere is `mcp:scheduling:read`, and that
 *   belongs to its MCP connector (`tidycal.com/mcp`), which is a separate,
 *   read-only surface — not this REST API. Requesting it here would be
 *   inventing a requirement, and requesting a guessed scope name is how an
 *   authorization request gets rejected outright.
 * - **`pkce`.** Passport supports PKCE, but whether TidyCal's clients are
 *   configured as public clients is not stated in the reference and cannot be
 *   determined without registering one. Declaring `pkce: true` against a
 *   confidential client breaks the exchange, so it is left off.
 *
 * The OAuth hosts are added to this method's allowlist implicitly by the
 * runtime, which is why `tidycal.com` appears once in `w6w.network.allow` for
 * the API and is not restated here.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with TidyCal)",
  description: "Public OAuth flow. Requires a TidyCal OAuth client (client_id / client_secret / " +
    "redirect_uri) registered under Integrations → Advanced and configured on this w6w " +
    "installation.",
  connectionLabel: "TidyCal ({{email}})",
  oauth2: {
    authorizationUrl: "https://tidycal.com/oauth/authorize",
    tokenUrl: "https://tidycal.com/oauth/token",
    // Measured live: the `refresh_token` grant reaches client validation rather
    // than `unsupported_grant_type`, so silent renewal is available.
    refreshUrl: "https://tidycal.com/oauth/token",
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * The same probe the personal token uses, for the same reason: `GET /api/me`
   * is the only endpoint whose response carries nothing but the account
   * holder's own identity. See `auth/personal-token.ts`.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) {
      return {
        ok: false,
        message: "TidyCal rejected the access token (401 Unauthenticated). It may have expired — " +
          "reconnect, or let the refresh grant renew it.",
      };
    }
    return { ok: false, message: `TidyCal returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Signed by the runtime, so no header is built here. Keeps the same three
   * fields the personal-token method publishes and drops the rest.
   */
  async afterConnect(_input, ctx) {
    try {
      const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        name?: string;
        email?: string;
        vanity_path?: string;
      };
      const out: Record<string, string> = {};
      if (body?.name) out.name = body.name;
      if (body?.email) out.email = body.email;
      if (body?.vanity_path) out.vanityPath = body.vanity_path;
      return out;
    } catch {
      return {};
    }
  },
};

export default oauth2;
