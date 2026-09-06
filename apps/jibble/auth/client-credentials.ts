import type { AuthDefinition } from "@w6w/types";
import { formatJibbleError, TOKEN_URL, WORKSPACE_HOST } from "../lib/client.ts";

/**
 * OAuth2 **client credentials** grant against Jibble's own identity service.
 *
 * Verified against the collection's "Get Access Token" folder: `POST
 * https://identity.prod.jibble.io/connect/token`, **form-urlencoded** (not JSON) —
 *
 *     grant_type=client_credentials&client_id=...&client_secret=...
 *
 * answering:
 *
 *     { "access_token": "...", "expires_in": 2147483647, "token_type": "Bearer",
 *       "scope": "api1", "organizationId": "...", "personId": "..." }
 *
 * ## `expires_in` in the vendor's own example is `2147483647` — `Int32.MaxValue`
 *
 * That is a ~68-year token lifetime, i.e. Jibble's documented example is a sentinel for "does
 * not meaningfully expire" rather than a real short-lived OAuth token. `expiresAt` is still
 * recorded and `refresh` still re-mints on request (client id/secret never expire either, so
 * re-minting is always cheap and safe) — but a workflow should not expect Jibble's access
 * token to behave like a typical hour-long OAuth token, and should not be surprised if it
 * keeps working for months.
 *
 * ## One scope for the whole API — `api1`
 *
 * The token response's `scope` is always `api1` in the collection; there is no per-endpoint
 * or per-resource scope to request or negotiate, unlike Vanta or GitHub. A live token is
 * either valid for the whole organization or not valid at all.
 *
 * ## The response also carries `organizationId` and `personId`
 *
 * Both identify the application's own service-account context (which organization the
 * credential belongs to, and the "person" record minted for the app itself). Recorded via
 * `afterConnect` purely as display metadata — never treated as authority, and never handed to
 * an Action.
 */
export interface JibbleClientCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  /** ISO 8601. Informational — `sign` never checks it; `refresh` always re-mints on request. */
  expiresAt?: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  organizationId?: string;
  personId?: string;
  error?: string;
  error_description?: string;
}

async function mintToken(
  ctx: { fetch: typeof fetch },
  clientId: string,
  clientSecret: string,
): Promise<
  { accessToken: string; expiresAt?: string; organizationId?: string; personId?: string }
> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const raw = await res.text();
  let body: TokenResponse = {};
  try {
    body = raw ? (JSON.parse(raw) as TokenResponse) : {};
  } catch { /* fall through — reason resolved from raw text below */ }

  if (!res.ok || !body.access_token) {
    const reason = body.error_description ?? body.error ??
      (raw ? raw.slice(0, 300) : `HTTP ${res.status}`);
    throw new Error(
      `Jibble refused to mint an access token (${reason}). Check the Client ID and Client ` +
        "Secret from Jibble's Developer settings (Settings → Developer → API Access).",
    );
  }

  const expiresAt = typeof body.expires_in === "number"
    ? new Date(Date.now() + body.expires_in * 1000).toISOString()
    : undefined;
  return {
    accessToken: body.access_token,
    expiresAt,
    organizationId: body.organizationId,
    personId: body.personId,
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "API Client (Client ID / Secret)",
  description: "Server-to-server access via a client_credentials grant. No browser sign-in; " +
    "the resulting token is scoped to the whole organization (Jibble's API has one scope, " +
    "`api1`).",
  connectionLabel: "Jibble ({{organizationName}})",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "credentials",
      hint: "Jibble web app → Settings → Developer → API Access.",
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

  /** Same call again — Jibble issues no separate refresh token to redeem instead. */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<JibbleClientCredentials>;
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
    const cred = credential as Partial<JibbleClientCredentials>;
    request.headers["authorization"] = `Bearer ${cred.accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /v1/Organizations` — the cheapest read that proves the token works, needs no scope
   * (there is only one, `api1`), and returns no credential material.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<JibbleClientCredentials>;
    if (!cred.accessToken) return { ok: false, message: "credential is missing accessToken" };

    let res: Response;
    try {
      res = await ctx.fetch(`${WORKSPACE_HOST}/v1/Organizations`, {
        headers: { authorization: `Bearer ${cred.accessToken}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${WORKSPACE_HOST}: ${String(err)}` };
    }

    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, message: formatJibbleError(res.status, "GET", "/v1/Organizations", raw) };
    }

    const body = JSON.parse(raw || "{}") as { value?: Array<{ name?: string }> };
    const org = body.value?.[0];
    return {
      ok: true,
      message: org?.name ? `connected to organization "${org.name}"` : "connected",
    };
  },

  /** Records which organization this credential belongs to. Never the credential itself. */
  afterConnect({ credential }, ctx) {
    const cred = credential as Partial<JibbleClientCredentials>;
    if (!cred.accessToken) return {};
    return ctx.fetch(`${WORKSPACE_HOST}/v1/Organizations`, {
      headers: { authorization: `Bearer ${cred.accessToken}`, accept: "application/json" },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((body: { value?: Array<{ id?: string; name?: string }> } | null) => {
        const org = body?.value?.[0];
        return org ? { organizationId: org.id, organizationName: org.name } : {};
      })
      .catch(() => ({}));
  },
};

export default clientCredentials;
