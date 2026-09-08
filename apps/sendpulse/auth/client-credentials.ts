import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_HOST, errorMessage, TOKEN_URL } from "../lib/client.ts";

/**
 * OAuth2 **client credentials** — SendPulse's only third-party auth grant.
 *
 * SendPulse's own docs call the pasted values "ID" and "Secret" (visible on
 * the account's API widget), but on the wire they travel as the standard
 * `client_id` / `client_secret` OAuth2 form fields, confirmed against
 * `POST https://api.sendpulse.com/oauth/access_token` (named as the
 * `clientCredentials` flow's `tokenUrl` in every one of SendPulse's four
 * published OpenAPI documents — bulk-email, crm, chatbots, a360 — so it is
 * one token for the whole account, not one per module).
 *
 * Confirmed on the wire 2026-09-06: the endpoint accepts either a JSON body
 * or `application/x-www-form-urlencoded` identically, so this uses JSON to
 * match the rest of the API. A bad client id/secret answers **401** with
 * `{"error":"invalid_client","error_description":"Client authentication
 * failed","message":"Client authentication failed"}` — a THIRD error
 * envelope shape, distinct from both of the ordinary-API shapes documented
 * in `lib/client.ts`.
 *
 * `type: "custom"`, not `"oauth2"`: the `oauth2` type in this spec models the
 * browser authorization-code flow (`authorizationUrl` + PKCE). This is the
 * machine-to-machine grant — no redirect, no user interaction — so it keeps
 * working in scheduled and background runs, the same shape as the sibling
 * `paypal`/`kajabi`/`mautic` apps' `client-credentials` auth.
 *
 * There is no refresh token in this grant (SendPulse's own OpenAPI docs
 * describe it as minting "temporary tokens (valid for 1 hour)" and name no
 * refresh flow), so `refresh` just re-runs the same exchange — the same
 * pattern as `mautic` and `paypal`.
 */

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  message?: string;
}

/** What this app persists on the Connection. */
export interface SendPulseCredential {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  expiresAt?: string;
}

async function requestToken(
  ctx: HookContext,
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    body = {};
  }

  if (!res.ok || !body.access_token) {
    const detail = body.error_description ?? body.message ?? errorMessage(text);
    throw new Error(
      `SendPulse token request failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return body;
}

/**
 * `expiresAt` lets the host refresh *before* SendPulse starts answering 401.
 * SendPulse's own OpenAPI description of the grant states tokens are "valid
 * for 1 hour" — the 3600-second fallback is that documented lifetime, used
 * only when a response omits `expires_in`. The 60-second haircut absorbs
 * clock skew between this host and SendPulse regardless of the real TTL.
 */
function foldToken(
  base: { clientId: string; clientSecret: string },
  body: TokenResponse,
): SendPulseCredential {
  return {
    clientId: base.clientId,
    clientSecret: base.clientSecret,
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "API ID & Secret",
  description: "Find your account's ID and Secret under Account Settings → API in the SendPulse " +
    "dashboard, then paste them here. No browser sign-in, so it keeps working in scheduled and " +
    "background runs. One credential authenticates the whole account across every SendPulse " +
    "module — CRM and Bulk Email both use it.",
  connectionLabel: "SendPulse account",
  fields: [
    { key: "clientId", label: "ID", type: "secret", required: true, row: "client" },
    { key: "clientSecret", label: "Secret", type: "secret", required: true, row: "client" },
  ],

  /** Turns the pasted ID and Secret into a live access token at connect time. */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("ID and Secret are both required.");
    }
    const body = await requestToken(ctx, clientId, clientSecret);
    return foldToken({ clientId, clientSecret }, body);
  },

  /** Re-mints from the stored ID/Secret — there is no refresh token for this grant. */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<SendPulseCredential>;
    const { clientId, clientSecret } = cred;
    if (!clientId || !clientSecret) {
      throw new Error("credential is missing clientId or clientSecret — reconnect");
    }
    const body = await requestToken(ctx, clientId, clientSecret);
    return foldToken({ clientId, clientSecret }, body);
  },

  /** The only hook that stamps the token. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<SendPulseCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /balance` — chosen by reading its response body, not its name. It
   * answers `{"currency": "USD", "balance_currency": 0.02}` (Bulk Email's
   * `BalanceResponse` schema) — no credential material, and no module scope
   * beyond having a SendPulse account at all, so a CRM-only or Email-only
   * plan is never reported unhealthy for lacking the other module's
   * permission. `GET /crm/v1/users` was rejected as the probe for exactly
   * that reason: it 403s for an account whose plan excludes the CRM.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SendPulseCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing an access token" };

    const res = await ctx.fetch(`${API_HOST}/balance`, {
      headers: { accept: "application/json", authorization: `Bearer ${cred.accessToken}` },
    });
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `SendPulse rejected the token (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). The access token may have expired, or the ID/Secret pair was rotated or deleted.`,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `SendPulse returned 403${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        } — the token authenticated, but this account is not permitted to call the API.`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `SendPulse returned ${res.status}${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }`,
      };
    }
    return { ok: true };
  },
};

export default clientCredentials;
