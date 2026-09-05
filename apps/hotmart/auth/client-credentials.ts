import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, compact, formatHotmartError, TOKEN_URL, USER_PREFIX } from "../lib/client.ts";

/**
 * Hotmart OAuth 2.0 client_credentials — with a twist.
 *
 * Verified against `developers.hotmart.com/docs/en/start/app-auth/` and a
 * live, unauthenticated probe of `api-sec-vlc.hotmart.com` on 2026-09-05.
 *
 * ## Three secrets, not two
 *
 * Hotmart's Developer Credentials tool (Tools > Developer Credentials) mints
 * **three** values at once: `client_id`, `client_secret`, and a third value
 * the docs literally call "token of the Basic type". All three are required
 * to mint an access token — `client_id`/`client_secret` as **query
 * parameters** on the token request, and the Basic token as an
 * `Authorization: Basic <token>` **header**, at the same time:
 *
 * ```
 * POST https://api-sec-vlc.hotmart.com/security/oauth/token
 *      ?grant_type=client_credentials&client_id=...&client_secret=...
 * Authorization: Basic <basicToken>
 * ```
 *
 * This is easy to get wrong two ways: (a) assuming the Basic header is the
 * textbook `base64(client_id:client_secret)` HTTP Basic construction — it is
 * not; Hotmart hands you an opaque pre-built value, not the two halves to
 * encode yourself — and (b) sending the credentials as `Authorization:
 * Bearer` on the token call itself, which is for every *other* endpoint, not
 * this one.
 *
 * ## The access token is short-lived; the three secrets are not
 *
 * A successful exchange returns `expires_in` (~172,799s / 48h in every
 * observed sample). Only the resulting `access_token` expires — `client_id`,
 * `client_secret` and the Basic token do not, so `refresh` simply repeats the
 * same exchange rather than needing a distinct refresh-token grant.
 *
 * ## `test` re-runs the exchange, not a resource read
 *
 * A resource read (e.g. `GET /user/api/v1/me`) would only prove today's
 * cached `access_token` still works, which says nothing about whether the
 * three stored secrets are themselves still valid — and would report a
 * healthy Connection as broken the moment the access token merely expires
 * between scheduled health checks. Re-running the token exchange verifies
 * the actual long-lived credential and is exactly what a live Connection
 * needs to keep doing anyway.
 *
 * This does not "echo back the caller's own key": the exchange consumes the
 * caller's secrets and returns a *freshly minted, different* access token —
 * the normal shape of an OAuth token endpoint, not a whoami that reflects
 * the input credential in its response body.
 */

export interface HotmartCredential {
  clientId: string;
  clientSecret: string;
  basicToken: string;
  /** Set after a successful exchange/refresh. Absent means "never exchanged". */
  accessToken?: string;
  tokenType?: string;
  /** Epoch ms. Set from the token response's `expires_in`. */
  expiresAt?: number;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  jti?: string;
}

interface TokenErrorBody {
  error?: string;
  error_description?: string;
}

type TokenResult =
  | { ok: true; body: TokenResponse }
  | { ok: false; status: number; raw: string };

/**
 * The one place the token exchange is built. Exported so `exchange`,
 * `refresh` and `test` all run the identical request — a hand-rolled second
 * copy is how one of them ends up sending a header the others do not.
 */
export async function requestAccessToken(
  ctx: HookContext,
  clientId: string,
  clientSecret: string,
  basicToken: string,
): Promise<TokenResult> {
  const url = new URL(TOKEN_URL);
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);

  const res = await ctx.fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${basicToken}`,
    },
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) return { ok: false, status: res.status, raw };

  let body: TokenResponse | null = null;
  try {
    body = raw ? (JSON.parse(raw) as TokenResponse) : null;
  } catch {
    return { ok: false, status: res.status, raw };
  }
  if (!body?.access_token) return { ok: false, status: res.status, raw };
  return { ok: true, body };
}

/** Classify a failed token exchange using the same `{error, error_description}` envelope. */
export function describeTokenFailure(status: number, raw: string): string {
  return formatHotmartError(status, "POST", "/security/oauth/token", raw ?? "");
}

function credentialFrom(
  clientId: string,
  clientSecret: string,
  basicToken: string,
  token: TokenResponse,
): HotmartCredential {
  return {
    clientId,
    clientSecret,
    basicToken,
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresAt: typeof token.expires_in === "number"
      ? Date.now() + token.expires_in * 1000
      : undefined,
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Client Credentials",
  description: "Paste the Client ID, Client Secret and Basic token generated by Hotmart under " +
    "Tools > Developer Credentials. All three are required to mint an access token.",
  connectionLabel: "Hotmart ({{name}})",
  fields: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
    },
    {
      key: "basicToken",
      label: "Basic Token",
      type: "secret",
      required: true,
      hint: 'The third value Hotmart generates alongside Client ID/Secret, labeled "Basic" in ' +
        "Tools > Developer Credentials. It is not something you construct yourself.",
    },
  ],

  /** Turns the three pasted fields into a stored credential carrying a live access token. */
  async exchange({ fields }, ctx) {
    const clientId = String(fields?.clientId ?? "").trim();
    const clientSecret = String(fields?.clientSecret ?? "").trim();
    const basicToken = String(fields?.basicToken ?? "").trim();
    if (!clientId || !clientSecret || !basicToken) {
      throw new Error("clientId, clientSecret and basicToken are all required");
    }

    const result = await requestAccessToken(ctx, clientId, clientSecret, basicToken);
    if (!result.ok) {
      throw new Error(describeTokenFailure(result.status, result.raw));
    }
    return credentialFrom(clientId, clientSecret, basicToken, result.body);
  },

  /** Re-runs the exchange with the stored secrets — see the module doc for why not a resource read. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HotmartCredential>;
    const clientId = (cred?.clientId ?? "").trim();
    const clientSecret = (cred?.clientSecret ?? "").trim();
    const basicToken = (cred?.basicToken ?? "").trim();
    if (!clientId || !clientSecret || !basicToken) {
      return { ok: false, message: "credential missing clientId, clientSecret or basicToken" };
    }

    const result = await requestAccessToken(ctx, clientId, clientSecret, basicToken);
    if (result.ok) return { ok: true };

    let type: string | undefined;
    try {
      type = (JSON.parse(result.raw) as TokenErrorBody)?.error;
    } catch { /* not JSON */ }

    if (type === "unauthorized" || result.status === 401) {
      return {
        ok: false,
        message: "Hotmart rejected the Client ID/Secret/Basic token combination — check they " +
          "were copied exactly from Tools > Developer Credentials and that the credential has " +
          "not been deleted.",
      };
    }
    return {
      ok: false,
      message: describeTokenFailure(result.status, result.raw),
    };
  },

  /** The only hook handed the raw credential, and it runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<HotmartCredential>;
    request.headers["authorization"] = `Bearer ${cred.accessToken ?? ""}`;
    return request;
  },

  /** Renews the access token from the same three long-lived secrets. */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<HotmartCredential>;
    const clientId = (cred?.clientId ?? "").trim();
    const clientSecret = (cred?.clientSecret ?? "").trim();
    const basicToken = (cred?.basicToken ?? "").trim();
    if (!clientId || !clientSecret || !basicToken) {
      throw new Error("cannot refresh: credential missing clientId, clientSecret or basicToken");
    }
    const result = await requestAccessToken(ctx, clientId, clientSecret, basicToken);
    if (!result.ok) throw new Error(describeTokenFailure(result.status, result.raw));
    return credentialFrom(clientId, clientSecret, basicToken, result.body);
  },

  /**
   * Publishes the producer's own name/email for `connectionLabel`, and nothing else.
   *
   * A failure here is deliberately silent: `test` has already established the
   * credential is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<HotmartCredential>;
    if (!cred.accessToken) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}${USER_PREFIX}/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${cred.accessToken}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as { name?: string; email?: string };
      return compact({ name: body?.name, email: body?.email });
    } catch {
      return {};
    }
  },
};

export default clientCredentials;
