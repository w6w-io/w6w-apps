import type { AuthDefinition } from "@w6w/types";
import { AUTH_URL } from "../lib/client.ts";

/**
 * Personio's "Client Credentials" grant — quoted from Personio's own naming, but the wire
 * format is a plain custom REST call, not standard OAuth2 `client_credentials`. See
 * `lib/client.ts`'s module doc for the full finding; the short version:
 *
 *     POST https://api.personio.de/v1/auth
 *     { "client_id": "...", "client_secret": "..." }
 *     -> { "success": true, "data": { "token": "papi-eyJ...", "expires_in": 86400 } }
 *
 * No `grant_type`, no Basic-auth header, no `token_type` — credentials travel as a JSON
 * body and the response wraps everything in Personio's `{ success, data }` envelope.
 *
 * ## The token is stable for 24 hours — minting is (functionally) idempotent
 *
 * Personio's Authentication guide states the token "remains the same, i.e. stable, for a
 * period of 24 hours" once minted for a given Client ID/Secret pair, and "can be used for
 * an indefinite number of calls in the 24 hour period." So `refresh` here re-mints exactly
 * like `exchange` — there is no separate refresh token to redeem — but re-minting inside
 * the 24h window is cheap: Personio hands back the same token rather than invalidating the
 * old one.
 *
 * ## The auth endpoint has its OWN, separate rate limit
 *
 * 150 requests/minute; exceeding it throttles further attempts to 1/second for the next 60
 * seconds, after which the limit resets to 150/minute (Personio's Authentication guide,
 * read 2026-09-06 — "this is an upgrade from the v1 rate limit of 60 requests per
 * minute"). A workflow that calls `test`/`refresh` far more often than once per token
 * lifetime gains nothing (the token doesn't change) and risks tripping this independently
 * of any Personnel Data endpoint's own limits.
 *
 * ## Minted tokens carry a `papi-` prefix and work ONLY on the Personnel Data API
 *
 * "The bearer token can then be used to access any Personnel Data endpoint (i.e. all
 * endpoints except Auth and Recruiting)." The Recruiting API needs an entirely different,
 * separately-issued static token — out of scope for this app; see the README.
 */
export interface PersonioClientCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  /** ISO 8601. Informational only — `sign` never checks it; `test`/`refresh` re-mint. */
  expiresAt?: string;
}

interface AuthTokenResponse {
  success?: boolean;
  data?: { token?: string; expires_in?: number; scope?: string };
  error?: { code?: number | string; message?: string };
}

async function mintToken(
  ctx: { fetch: typeof fetch },
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresAt?: string }> {
  const res = await ctx.fetch(AUTH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  const raw = await res.text();
  let body: AuthTokenResponse = {};
  try {
    body = raw ? (JSON.parse(raw) as AuthTokenResponse) : {};
  } catch { /* fall through — reason resolved from raw text below */ }

  const token = body.data?.token;
  if (!res.ok || !body.success || !token) {
    const reason = body.error?.message ?? (raw ? raw.slice(0, 300) : `HTTP ${res.status}`);
    throw new Error(
      `Personio refused to mint an access token (${reason}). Check the Client ID and ` +
        "Client Secret from Personio's API Credentials settings page.",
    );
  }

  const expiresAt = typeof body.data?.expires_in === "number"
    ? new Date(Date.now() + body.data.expires_in * 1000).toISOString()
    : undefined;
  return { accessToken: token, expiresAt };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "API Credentials (Client ID / Secret)",
  description: "Server-to-server access to the Personnel Data API. Mints and renews its " +
    "own bearer token from a Client ID and Client Secret; no browser sign-in.",
  connectionLabel: "Personio",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "credentials",
      hint: "Personio → Settings → Integrations → API Credentials.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "credentials",
    },
  ],

  /** Mints the first access token from the pasted Client ID/Secret. */
  async exchange({ fields }, ctx) {
    const { clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    const { accessToken, expiresAt } = await mintToken(ctx, clientId, clientSecret);
    return { clientId, clientSecret, accessToken, expiresAt };
  },

  /** Re-mints — Personio issues no separate refresh token to redeem instead. */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<PersonioClientCredentials>;
    if (!cred.clientId || !cred.clientSecret) {
      throw new Error(
        "cannot renew this connection: it has no stored Client ID and Client Secret. Reconnect.",
      );
    }
    const { accessToken, expiresAt } = await mintToken(ctx, cred.clientId, cred.clientSecret);
    return { ...cred, accessToken, expiresAt };
  },

  /** Injects the bearer token. Runs network-less: it stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<PersonioClientCredentials>;
    request.headers["authorization"] = `Bearer ${cred.accessToken ?? ""}`;
    return request;
  },

  /** Re-mints (cheap — the token is stable for 24h) and reports whether that succeeded. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PersonioClientCredentials>;
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
