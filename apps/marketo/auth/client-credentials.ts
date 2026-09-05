import type { AuthDefinition, HookContext } from "@w6w/types";
import {
  API_PATH,
  errorMessage,
  normalizeIdentityUrl,
  normalizeRestBaseUrl,
} from "../lib/client.ts";

/**
 * OAuth2 **client credentials** grant — Marketo's own and only REST
 * authentication method (`authentication.md`, `custom-services.md`, fetched
 * 2026-09-05, `github.com/AdobeDocs/marketo-developer.en`): "Marketo REST
 * APIs use 2-legged OAuth 2.0 for authentication." There is no authorization
 * code / browser-login flow to choose instead — this is the whole surface.
 *
 * ## Two URLs, not one, and Marketo does not say how they relate
 *
 * A Custom Service (Admin > Integration > LaunchPoint) has a Client ID and
 * Client Secret. Minting a token needs the **Identity URL**
 * (Admin > Integration > Web Services), a separate value from the **REST
 * base URL** shown on the same page. Community convention assumes the
 * Identity URL is always the REST host with `/identity` swapped in for
 * `/rest`, but nothing in Marketo's own documentation states that rule, so
 * this app does not derive one from the other — both are collected as their
 * own connection field, exactly as the operator copies them.
 *
 * ## Credentials travel in the query string, not the body
 *
 * `authentication.md`'s own worked example mints a token with:
 *
 * ```
 * GET <Identity URL>/oauth/token?grant_type=client_credentials&client_id=<Client Id>&client_secret=<Client Secret>
 * ```
 *
 * — a GET request, `client_secret` in the URL. This is the documented
 * mechanism (not a shortcut this app takes), but it is worth knowing before
 * wiring up request logging anywhere in front of the Identity endpoint: a
 * client secret in a query string is more likely to land in an access log
 * than one in a POST body or an Authorization header.
 *
 * ## No refresh token
 *
 * The response carries `access_token`, `token_type`, `expires_in` and
 * `scope` only — no `refresh_token`. There is nothing to trade in once the
 * token expires, so `refresh` just re-runs the same `client_credentials`
 * grant, which is also Marketo's own documented recovery path for a 601/602.
 *
 * ## Only the Identity endpoint uses a real HTTP 401
 *
 * `error-codes.md`: "The Identity endpoint can return a 401 Unauthorized
 * error, typically because the Client Id or Client Secret is invalid." Every
 * other Marketo REST call answers `200` even on failure (see `lib/client.ts`
 * for the enveloped `success: false` shape) — so `exchange`/`refresh` check
 * `res.status`, while `test` (which calls a normal REST endpoint) must read
 * the response body instead.
 */

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

/** What this app persists on the Connection. */
export interface MarketoCredential {
  restBaseUrl: string;
  identityUrl: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  expiresAt?: string;
  scope?: string;
}

async function requestToken(
  ctx: HookContext,
  identityUrl: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const url = new URL(`${identityUrl}/oauth/token`);
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);

  const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? (JSON.parse(text) as TokenResponse) : {};
  } catch {
    body = {};
  }

  if (res.status === 401) {
    throw new Error(
      `Marketo Identity rejected the request (401) — the Client ID or Client Secret is invalid.`,
    );
  }
  if (!res.ok || !body.access_token) {
    const detail = body.error_description ?? body.error ?? "";
    throw new Error(`Marketo token request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return body;
}

/**
 * Fold a token response into the stored credential. The 60-second haircut
 * absorbs clock skew between this host and Marketo's own; a fresh token is
 * documented as living 3,600 seconds.
 */
function foldToken(
  base: { restBaseUrl: string; identityUrl: string; clientId: string; clientSecret: string },
  body: TokenResponse,
): MarketoCredential {
  return {
    ...base,
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
    scope: body.scope,
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "Custom Service (Client Credentials)",
  description:
    "Create a Custom Service at Admin > Integration > LaunchPoint in your Marketo instance " +
    "(Service: Custom, backed by an API-Only user). Paste its Client ID and Client Secret here " +
    "with your instance's REST base URL and Identity URL, both from Admin > Integration > Web " +
    "Services. No browser sign-in, so it keeps working in scheduled and background runs.",
  connectionLabel: "{{scope}}",
  fields: [
    {
      key: "restBaseUrl",
      label: "REST Base URL",
      type: "string",
      required: true,
      placeholder: "https://123-ABC-456.mktorest.com",
      hint: 'Admin > Integration > Web Services — the "Endpoint" in the REST API box. A ' +
        "trailing /rest is fine either way.",
    },
    {
      key: "identityUrl",
      label: "Identity URL",
      type: "string",
      required: true,
      placeholder: "https://123-ABC-456.mktorest.com/identity",
      hint: "Also from Admin > Integration > Web Services — a separate value from the REST " +
        "base URL, used only to mint tokens.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "LaunchPoint > your Custom Service > View Details.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint: "Shown alongside the Client ID. Rotating it invalidates every token minted from it.",
    },
  ],

  /** Turns the pasted client id and secret into a live access token at connect time. */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const clientId = String(f.clientId ?? "").trim();
    const clientSecret = String(f.clientSecret ?? "").trim();
    if (!clientId || !clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    const restBaseUrl = normalizeRestBaseUrl(String(f.restBaseUrl ?? ""));
    const identityUrl = normalizeIdentityUrl(String(f.identityUrl ?? ""));
    const body = await requestToken(ctx, identityUrl, clientId, clientSecret);
    return foldToken({ restBaseUrl, identityUrl, clientId, clientSecret }, body);
  },

  /** Re-mint from the stored client id and secret — there is no refresh token (see file header). */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<MarketoCredential>;
    const { restBaseUrl, identityUrl, clientId, clientSecret } = cred;
    if (!restBaseUrl || !identityUrl || !clientId || !clientSecret) {
      throw new Error(
        "credential is missing restBaseUrl, identityUrl, clientId or clientSecret — reconnect",
      );
    }
    const body = await requestToken(ctx, identityUrl, clientId, clientSecret);
    return foldToken({ restBaseUrl, identityUrl, clientId, clientSecret }, body);
  },

  /** The only hook that stamps the token. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<MarketoCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /rest/v1/leads/describe.json` is the probe. It needs only the
   * "Read-Only Lead" permission Marketo's own Getting Started guide
   * recommends as the minimum API role, echoes no credential material (the
   * response is field metadata — names, types, lengths), and every REST
   * call — including this one — answers HTTP 200 even on failure, so the
   * check reads `success`/`errors` from the body rather than `res.status`
   * (see `lib/client.ts`).
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MarketoCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing an access token" };
    if (!cred?.restBaseUrl) return { ok: false, message: "credential missing restBaseUrl" };

    const res = await ctx.fetch(`${cred.restBaseUrl}${API_PATH}/leads/describe.json`, {
      headers: { accept: "application/json", authorization: `Bearer ${cred.accessToken}` },
    });
    const text = await res.text().catch(() => "");
    let body: { success?: boolean; errors?: Array<{ code: string; message: string }> } | undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    if (!body) {
      return {
        ok: false,
        message: `Marketo returned a non-JSON response (${res.status}) from ` +
          `${cred.restBaseUrl}${API_PATH} — check the REST base URL.`,
      };
    }
    if (body.success === true) return { ok: true };

    const codes = (body.errors ?? []).map((e) => e.code);
    if (codes.includes("601") || codes.includes("602")) {
      return {
        ok: false,
        message: `Marketo rejected the token (${errorMessage(body.errors)}). The access token ` +
          "may have expired, or the Custom Service was deleted or its secret rotated.",
      };
    }
    if (codes.includes("603")) {
      return {
        ok: false,
        message: "Marketo returned 603 Access Denied — the token authenticated, but this " +
          "Custom Service's API-Only user lacks the Read-Only Lead permission.",
      };
    }
    if (codes.includes("610")) {
      return {
        ok: false,
        message: `no Marketo REST API at ${cred.restBaseUrl}${API_PATH} (610) — check the REST ` +
          "base URL.",
      };
    }
    return {
      ok: false,
      message: `Marketo returned success: false${
        body.errors?.length ? `: ${errorMessage(body.errors)}` : ""
      }`,
    };
  },

  /** Records the instance and the token's owning scope. Never the token itself. */
  afterConnect({ credential }) {
    const cred = credential as Partial<MarketoCredential>;
    return { restBaseUrl: cred.restBaseUrl, identityUrl: cred.identityUrl, scope: cred.scope };
  },
  // No `revoke`: Marketo's REST API documents no token-revocation endpoint for
  // the client-credentials grant. Deleting the Custom Service in Admin >
  // Integration > LaunchPoint invalidates every token minted from it, but
  // that action is not exposed over the API this app can reach — it is the
  // operator's own step, same as rotating the client secret.
};

export default clientCredentials;
