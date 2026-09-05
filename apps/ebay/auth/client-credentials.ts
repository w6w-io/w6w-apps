import type { AuthDefinition } from "@w6w/types";
import { API_BASE, SCOPE_PUBLIC_DATA, TOKEN_PATH } from "../lib/client.ts";

/**
 * OAuth2 Client Credentials (`custom`).
 *
 * eBay's Buy Browse API and Developer Analytics API (the only two surfaces
 * this app covers) authorize with an **Application access token**: a
 * registered app's Client ID + Client Secret are exchanged for a token via
 * `POST /identity/v1/oauth2/token`, HTTP Basic `clientId:clientSecret`,
 * `grant_type=client_credentials`, `scope=<space-separated scopes>`.
 * Verified live against the real production token endpoint —
 * `curl -X POST https://api.ebay.com/identity/v1/oauth2/token` with a
 * fabricated Basic header returns `401
 * {"error":"invalid_client","error_description":"client authentication
 * failed"}`, the standard OAuth2 (RFC 6749 §5.2) error shape.
 *
 * No browser round-trip and nothing tied to an individual eBay user, so this
 * keeps working in scheduled/background runs — the same reasoning PayPal's
 * `client-credentials` auth documents for its own client-credentials grant.
 *
 * `type: "custom"` rather than `"oauth2"`: the `oauth2` type in this spec
 * models the browser authorization-code flow (`authorizationUrl` + PKCE) that
 * eBay's *seller*-scoped APIs (Sell Inventory, Sell Fulfillment, …) use — a
 * different, user-consented credential this app does not need or request.
 *
 *   exchange — form values (clientId, clientSecret) -> a live token
 *   refresh  — the same call again, when the runtime sees the token expire
 *   sign     — stamps the current token on each request
 *   test     — re-runs the exchange; the narrowest possible liveness probe,
 *              since it needs no scope beyond what every registered app has
 */
async function mintToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const res = await ctx.fetch(`${API_BASE}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${creds.clientId}:${creds.clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE_PUBLIC_DATA)}`,
  });
  const body = await res.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `eBay token request failed (${res.status}): ${
        body.error_description ?? body.error ?? "no token"
      }`,
    );
  }
  return {
    ...creds,
    accessToken: body.access_token,
    // eBay's Application access tokens are documented to last 7,200 seconds
    // (2 hours); the minute of headroom absorbs clock skew regardless of the
    // actual `expires_in` eBay returns.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 7200) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Client Credentials",
  description: "Create an app at developer.ebay.com/my/keys, then paste its Client ID and " +
    "Client Secret. No browser sign-in, so it works in scheduled runs. Grants access to eBay's " +
    "public data only (listing search and lookup) — not any seller's own account.",
  fields: [
    { key: "clientId", label: "Client ID", type: "secret", required: true, row: "client" },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
  ],

  /** Turns the pasted values into a live token at connect time. */
  exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    return mintToken(ctx, { clientId, clientSecret });
  },

  /** Same call again — the client id/secret never expire, only the token does. */
  refresh({ credential }, ctx) {
    const { clientId, clientSecret } = credential as { clientId: string; clientSecret: string };
    return mintToken(ctx, { clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /** Re-runs the exact client-credentials exchange — no scope beyond what every app carries. */
  async test({ credential }, ctx) {
    const { clientId, clientSecret } = credential as {
      clientId?: string;
      clientSecret?: string;
    };
    if (!clientId || !clientSecret) {
      return { ok: false, message: "credential missing clientId or clientSecret — reconnect" };
    }
    try {
      await mintToken(ctx, { clientId, clientSecret });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },
};

export default clientCredentials;
