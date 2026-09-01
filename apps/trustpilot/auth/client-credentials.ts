import type { AuthDefinition } from "@w6w/types";
import { TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 **Client Credentials** grant — the one Trustpilot flow that needs no browser
 * and no end-user login, which is what makes it usable from an unattended workflow.
 *
 * Trustpilot's own framing (`grant-type-client-credentials`, read 2026-09-01): "The Client
 * Credentials grant type uses your domain's API Key and Secret to request an access
 * token. You can only use this grant type from server-side to avoid exposing your API
 * secret." The request is one `POST` to
 * `/v1/oauth/oauth-business-users-for-applications/accesstoken` with
 * `Authorization: Basic base64(API_KEY:API_SECRET)`,
 * `Content-Type: application/x-www-form-urlencoded` and body `grant_type=client_credentials`,
 * answering `{access_token, expires_in}`.
 *
 * ## No refresh token — re-mint, don't refresh
 *
 * "You can't refresh access tokens that you've obtained with the Client Credentials grant
 * type. When your access token expires, you must issue the same request to get a new
 * token." So `refresh` here is the identical POST `exchange` makes, exactly as Auth0's
 * and Twitch's client-credentials methods in this pack already do.
 *
 * ## The token carries no user — `x-business-user-id` fills that gap
 *
 * "If you use this grant type, the access token won't be assigned to a specific user. To
 * use endpoints that require a user's ID... provide the User ID as a header." The
 * Invitations API's `email-invitations` and `invitation-data/delete` endpoints both
 * document an optional `x-business-user-id` header for exactly this case: "Should be
 * provided when access token is obtained using client_credentials grant type... the user
 * must have either Admin or Manager role." This method carries that id as an optional
 * field and stamps the header whenever it is set — harmless on any endpoint that ignores
 * it.
 *
 * ## `test` re-mints, because nothing else works without a Business Unit ID
 *
 * Every private endpoint this grant can reach (the whole Invitations API) is scoped to a
 * `{businessUnitId}` this credential does not carry — there is no documented "whoami" a
 * bare token can hit on its own, unlike Apify's `/v2/users/me/limits` or Auth0's
 * `/api/v2/users`. Re-running the token mint is therefore the strongest, and the only
 * universal, proof this credential is still live: if the Client ID/Secret pair is still
 * valid, Trustpilot issues a token; if it has been revoked or mistyped, the same call
 * fails. It does not prove any one Business Unit's Invitations calls will succeed — that
 * depends on the app's own Trustpilot-side scope, which no unattended probe can observe.
 */
export interface TrustpilotClientCredentials {
  clientId: string;
  clientSecret: string;
  businessUserId?: string;
  accessToken?: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: string | number;
  error?: string;
  error_description?: string;
  message?: string;
}

async function mintToken(
  ctx: { fetch: typeof fetch },
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });

  const raw = await res.text();
  let body: TokenResponse = {};
  try {
    body = raw ? (JSON.parse(raw) as TokenResponse) : {};
  } catch { /* fall through — reason resolved from raw text below */ }

  if (!res.ok || !body.access_token) {
    const reason = body.error_description ?? body.error ?? body.message ??
      (raw ? raw.slice(0, 300) : `HTTP ${res.status}`);
    throw new Error(
      `Trustpilot refused to mint an access token (${reason}). Check the Client ID and ` +
        "Client Secret against Trustpilot Business → Integrations → API & Data.",
    );
  }

  const expiresIn = typeof body.expires_in === "string" ? Number(body.expires_in) : body.expires_in;
  return { accessToken: body.access_token, expiresIn };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Business User (Client Credentials)",
  description: "Server-to-server access to Trustpilot's private endpoints — currently the " +
    "Invitations API — via the OAuth 2.0 client-credentials grant. Mints and renews its " +
    "own access token from a Client ID and Client Secret; no browser sign-in.",
  connectionLabel: "Trustpilot (client credentials)",
  fields: [
    {
      key: "clientId",
      label: "Client ID (API Key)",
      type: "secret",
      required: true,
      row: "client",
      hint: "The same value used as the API Key for the public API. Trustpilot Business → " +
        "Integrations → API & Data.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
    },
    {
      key: "businessUserId",
      label: "Business User ID (optional)",
      type: "string",
      hint: "A Trustpilot user with Admin or Manager role on this account. Needed for " +
        "actions that create or delete invitations on someone's behalf — find it on that " +
        "user's profile page in Trustpilot Business. Leave empty if you only read data.",
    },
  ],

  /** Mints the first access token from the pasted Client ID/Secret. */
  async exchange({ fields }, ctx) {
    const { clientId, clientSecret, businessUserId } = (fields ?? {}) as Record<string, string>;
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    const { accessToken } = await mintToken(ctx, clientId, clientSecret);
    return { clientId, clientSecret, businessUserId, accessToken };
  },

  /** Re-mints — the client-credentials grant issues no refresh token to redeem instead. */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<TrustpilotClientCredentials>;
    if (!cred.clientId || !cred.clientSecret) {
      throw new Error(
        "cannot renew this connection: it has no stored Client ID and Client Secret. Reconnect.",
      );
    }
    const { accessToken } = await mintToken(ctx, cred.clientId, cred.clientSecret);
    return { ...cred, accessToken };
  },

  /**
   * Injects the bearer token, and the on-behalf-of header when one is configured. Runs
   * network-less: it stamps headers and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<TrustpilotClientCredentials>;
    request.headers["authorization"] = `Bearer ${cred.accessToken ?? ""}`;
    if (cred.businessUserId) request.headers["x-business-user-id"] = cred.businessUserId;
    return request;
  },

  /** See the module doc for why re-minting is the only universal probe available. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TrustpilotClientCredentials>;
    if (!cred.clientId || !cred.clientSecret) {
      return { ok: false, message: "credential is missing clientId/clientSecret" };
    }
    try {
      await mintToken(ctx, cred.clientId, cred.clientSecret);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },
};

export default clientCredentials;
