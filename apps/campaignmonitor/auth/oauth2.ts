import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Campaign Monitor OAuth 2.0 — the vendor's own preferred method.
 *
 * > "Authenticating using OAuth is preferred over using an API key with Basic
 * > Authentication."
 *
 * Everything below is transcribed from the reference's "Authenticating with
 * OAuth" section (fetched 2026-08-11). Three details are non-standard enough
 * that a generic OAuth2 client gets them wrong, and all three are expressed
 * declaratively here rather than in a hand-rolled flow:
 *
 * 1. **The authorization endpoint is `/oauth`, not `/oauth/authorize`**, and it
 *    lives on the API host: `https://api.createsend.com/oauth`.
 * 2. **`type=web_server` is a REQUIRED query parameter** on the authorize
 *    request ("type REQUIRED – MUST be web_server"). It is not part of RFC 6749,
 *    so it goes in `extraAuthParams`. The alternative value `user_agent` selects
 *    the implicit flow, which returns the token in a URL fragment and grants no
 *    refresh token — unusable for a background workflow host, so it is not
 *    offered.
 * 3. **Scopes are COMMA-separated, not space-separated.** The reference is
 *    explicit: "This is a comma separated list of valid permissions … so for
 *    example … you would provide scope as `SendCampaigns,ViewReports` (which,
 *    when URL-encoded would be `SendCampaigns%2CViewReports`)". Sending the
 *    RFC 6749 space separator produces `unknown_scope`. Hence
 *    `scopeSeparator: ","`.
 *
 * `pkce` is turned **off** because Campaign Monitor documents neither
 * `code_challenge` nor `code_challenge_method`, and the token request it does
 * document carries `client_secret` — i.e. a confidential client. Sending an
 * undocumented `code_challenge` and then a `code_verifier` the server never
 * asked for is exactly the kind of thing an unforgiving OAuth implementation
 * rejects outright.
 *
 * ## Access tokens are bearer tokens
 *
 * > "the token should be passed in as a bearer token in the Authorization header
 * > … `Authorization: Bearer MDRmODIzNTBhODQ1ZWU5ZDkz`"
 *
 * Confirmed live on 2026-08-11: a bogus bearer against
 * `GET /api/v3.3/clients.json` is answered `401 {"Code":120,"Message":"Invalid
 * OAuth Token"}` — a *different* code from the API key's 100, which is what
 * makes {@link OAUTH_CODE_MEANINGS} worth classifying on.
 *
 * ## Refresh: what is documented, and what is not
 *
 * The documented refresh request is a POST to `https://api.createsend.com/oauth/token`
 * with **exactly** `grant_type=refresh_token&refresh_token={refresh_token}` —
 * no `client_id` and no `client_secret` in the documented body. Whether the
 * endpoint also *tolerates* client credentials there is not stated anywhere in
 * the reference, so no custom `refresh` hook is shipped: the host's standard
 * refresh against `refreshUrl` is used, and this note is the record of the one
 * detail that could not be confirmed.
 *
 * ## Permissions
 *
 * All twelve documented permissions are offered. They are *account-level*
 * grants, not per-client: an OAuth connection sees whichever clients the
 * authorising user can see, which is why the `/transactional` endpoints treat
 * OAuth exactly like an account API key and require an explicit `clientID`.
 */

/** The twelve permissions, verbatim from the reference's Permissions table. */
export const SCOPES = [
  "ViewReports",
  "ManageLists",
  "CreateCampaigns",
  "ImportSubscribers",
  "SendCampaigns",
  "ViewSubscribersInReports",
  "ManageTemplates",
  "AdministerPersons",
  "AdministerAccount",
  "ViewTransactional",
  "SendTransactional",
  "Automation",
];

/** The three OAuth-specific 401 codes, which the API key path never produces. */
export const OAUTH_CODE_MEANINGS: Record<number, string> = {
  120: "Invalid OAuth Token — the token is not recognised; reconnect",
  121: "Expired OAuth Token — refresh it",
  122: "Revoked OAuth Token — the user revoked access; reconnect",
};

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0",
  description:
    "Sign in with Campaign Monitor. Preferred by the vendor over an API key, and the only method " +
    "that can request a narrowed set of permissions. Requires an OAuth application registered in " +
    "Campaign Monitor (Integrations → OAuth Registration).",
  connectionLabel: "{{label}}",
  oauth2: {
    // Note: `/oauth`, not `/oauth/authorize`.
    authorizationUrl: `${API_BASE}/oauth`,
    tokenUrl: `${API_BASE}/oauth/token`,
    refreshUrl: `${API_BASE}/oauth/token`,
    scopes: SCOPES,
    // Comma, not space. The vendor's example is `SendCampaigns,ViewReports`.
    scopeSeparator: ",",
    // Undocumented by the vendor, and the token request is a confidential-client
    // exchange carrying client_secret.
    pkce: false,
    // Required by the vendor and absent from RFC 6749.
    extraAuthParams: { type: "web_server" },
  },

  /**
   * The ONLY hook handed the raw credential, and it runs network-less.
   *
   * The host stores the token exchange's response; `access_token` is the field
   * the vendor documents, and `token` is the shape a host-normalised bearer
   * arrives in. Both are accepted so the same hook works either way rather than
   * silently signing with `undefined`.
   */
  sign({ request, credential }) {
    const cred = credential as { access_token?: string; token?: string };
    request.headers["authorization"] = `Bearer ${cred.access_token ?? cred.token ?? ""}`;
    return request;
  },

  /**
   * Probed against the same `/systemdate.json` as the API key method, and for
   * the same reasons — see `auth/api-key.ts#PROBE_PATH`. In particular it is
   * *not* the client-details endpoint, which returns a live `ApiKey`.
   */
  async test({ credential }, ctx) {
    const cred = credential as { access_token?: string; token?: string } | null;
    const token = (cred?.access_token ?? cred?.token ?? "").trim();
    if (!token) return { ok: false, message: "credential missing access_token" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/systemdate.json`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };

    // Classify from the body. All three OAuth failures are 401, and so is a
    // wrong client id (code 102) which is not a credential problem at all.
    const raw = await res.text().catch(() => "");
    let code: number | undefined;
    let message: string | undefined;
    try {
      const body = JSON.parse(raw) as { Code?: number; Message?: string };
      code = typeof body.Code === "number" ? body.Code : undefined;
      message = body.Message;
    } catch { /* not JSON */ }

    if (code !== undefined && OAUTH_CODE_MEANINGS[code]) {
      return {
        ok: false,
        message: `Campaign Monitor: ${OAUTH_CODE_MEANINGS[code]} (code ${code})`,
      };
    }
    if (code === 100) {
      return {
        ok: false,
        message:
          "Campaign Monitor answered code 100 (Invalid API Key) to a bearer token — the token " +
          "did not reach the request as a bearer. Reconnect this connection.",
      };
    }
    return {
      ok: false,
      message: `Campaign Monitor returned HTTP ${res.status}${
        code !== undefined ? ` code ${code}` : ""
      }${message ? `: ${message}` : ""} for /systemdate.json`,
    };
  },

  /**
   * Label the Connection with the clients the grant can see.
   *
   * `GET /clients.json` returns only `[{ClientID, Name}]` and carries no
   * credential material, unlike the per-client details endpoint. A failure is
   * silent: `test` has already established the token is live.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as { access_token?: string; token?: string } | null;
    const token = (cred?.access_token ?? cred?.token ?? "").trim();
    if (!token) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/clients.json`, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      if (!res.ok) return {};
      const clients = await res.json() as Array<{ ClientID?: string; Name?: string }>;
      if (!Array.isArray(clients) || clients.length === 0) return {};
      return clients.length === 1
        ? {
          label: `Campaign Monitor (${clients[0].Name ?? "1 client"})`,
          client: { id: clients[0].ClientID, name: clients[0].Name },
          clientCount: 1,
        }
        : {
          label: `Campaign Monitor (${clients.length} clients)`,
          clientCount: clients.length,
        };
    } catch {
      return {};
    }
  },
};

export default oauth2;
