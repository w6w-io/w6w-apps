import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_PATH, errorMessage, normalizeBaseUrl } from "../lib/client.ts";

/**
 * OAuth2 **client credentials** grant against a self-hosted instance's own
 * `oauth/v2/token` endpoint.
 *
 * ## What Mautic actually offers, and why this one
 *
 * `devdocs.mautic.org/en/7.1/rest_api/authentication.html` documents two ways
 * in: **Basic Authentication** (a Mautic user's own username and password,
 * base64-encoded, and off by default until an admin flips
 * `api_enable_basic_auth`) and **OAuth2**, which itself supports three grants
 * — `authorization_code`, `refresh_token`, and `client_credentials`. Mautic's
 * own words on the last one: it "suits Machine-to-Machine (M2M) communications
 * such as Cron jobs", where the Authorization Code flow is "best if you want
 * Users to log in with their own Mautic accounts" — an unattended workflow is
 * exactly the former, not the latter, so this app implements Client
 * Credentials and nothing else.
 *
 * Every action taken with it is attributed in Mautic to the name given to the
 * API Credential at creation (Settings → API Credentials) — "Contact was
 * identified by Mautibot test [1]" — so it is independently revocable and
 * auditable, the same property this pack's other self-hosted apps (`gitea`'s
 * personal access token, `mattermost`'s bot token) look for before trusting a
 * credential. Basic Auth is declined for the reason it usually is: it is a
 * real Mautic user's actual password, requires an extra server-side opt-in,
 * and revoking it means changing that user's password rather than deleting
 * one API Credential.
 *
 * ## `type: "custom"`, not `"oauth2"`
 *
 * The `oauth2` type in this spec models the browser authorization-code flow
 * against a **fixed** `authorizationUrl`/`tokenUrl`. Mautic is self-hosted, so
 * neither URL is fixed — both live under whatever origin the operator chose —
 * and this grant has no redirect step to model regardless. `exchange` and
 * `refresh` do the minting by hand against `{baseUrl}/oauth/v2/token`.
 *
 * ## No refresh token to fall back on
 *
 * Unlike the Authorization Code flow, Mautic's client-credentials response
 * carries only `access_token`, `expires_in`, `token_type` and `scope` — no
 * `refresh_token` field, confirmed against the documented response shape.
 * There is nothing to trade in when the access token expires, so `refresh`
 * simply re-runs the same `client_credentials` grant with the stored client id
 * and secret — which is also Mautic's own fallback path once a refresh token
 * lapses, so this app just starts there.
 */

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/** What this app persists on the Connection. */
export interface MauticCredential {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  expiresAt?: string;
}

/**
 * `POST /oauth/v2/token` — form-encoded, per every example in Mautic's
 * authentication docs. Credentials travel in the body as `client_id` /
 * `client_secret`, not a Basic header — that is what the docs show for every
 * grant, and it is also the only shape that carries no ambiguity about which
 * credential (the OAuth client vs. a Mautic user) is being sent.
 */
async function requestToken(
  ctx: HookContext,
  base: string,
  form: Record<string, string>,
): Promise<TokenResponse> {
  const res = await ctx.fetch(`${base}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(form).toString(),
  });

  const text = await res.text().catch(() => "");
  let body: TokenResponse = {};
  try {
    body = text ? JSON.parse(text) as TokenResponse : {};
  } catch {
    body = {};
  }

  if (!res.ok || !body.access_token) {
    const detail = errorMessage(text);
    throw new Error(`Mautic token request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return body;
}

/**
 * Fold a token response into the stored credential.
 *
 * `expiresAt` lets the host refresh *before* Mautic starts answering 401. The
 * 60-second haircut absorbs clock skew between this host and the Mautic
 * instance regardless of the token's real lifetime.
 */
function foldToken(
  base: { baseUrl: string; clientId: string; clientSecret: string },
  body: TokenResponse,
): MauticCredential {
  return {
    baseUrl: base.baseUrl,
    clientId: base.clientId,
    clientSecret: base.clientSecret,
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const clientCredentials: AuthDefinition = {
  key: "client-credentials",
  type: "custom",
  displayName: "API Credentials (Client Credentials)",
  description:
    "Create an API Credential at Settings → API Credentials in your Mautic instance, using the " +
    "Client Credentials grant type. Paste its Client ID and Client Secret here with your " +
    "instance URL. No browser sign-in, so it keeps working in scheduled and background runs. " +
    "The REST API must be turned on first, under Configuration → API Settings.",
  connectionLabel: "{{user.name}} @ {{site.host}}",
  fields: [
    {
      key: "baseUrl",
      label: "Instance URL",
      type: "string",
      required: true,
      placeholder: "https://mautic.example.com",
      hint: "Your Mautic server. A URL without a scheme is assumed to be https.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "Settings → API Credentials → New — grant type Client Credentials.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint: "Shown once at creation. Deleting the credential invalidates every token minted " +
        "from it.",
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
    const baseUrl = normalizeBaseUrl(String(f.baseUrl ?? ""));
    const body = await requestToken(ctx, baseUrl, {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    return foldToken({ baseUrl, clientId, clientSecret }, body);
  },

  /**
   * Re-mint from the stored client id and secret — there is no refresh token
   * for this grant (see the file header), so this is the only path back.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<MauticCredential>;
    const { baseUrl, clientId, clientSecret } = cred;
    if (!baseUrl || !clientId || !clientSecret) {
      throw new Error("credential is missing baseUrl, clientId or clientSecret — reconnect");
    }
    const body = await requestToken(ctx, baseUrl, {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    return foldToken({ baseUrl, clientId, clientSecret }, body);
  },

  /** The only hook that stamps the token. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<MauticCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /api/users/self` is the probe, chosen by reading its response body
   * rather than its name — the rule this pack learned from Follow Up Boss's
   * `/me` echoing the caller's own API key and Mailjet's `/apikey` echoing key
   * and secret. Mautic's is innocent: the documented response is `id`,
   * `username`, `firstName`, `lastName`, `email`, `position`, `role` and audit
   * timestamps. No token, no client secret.
   *
   * It also needs no permission beyond existing, so a correctly-scoped
   * credential is never reported broken for lacking access to some other
   * resource — the failure mode a collection endpoint like `/contacts` would
   * have.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MauticCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing an access token" };
    if (!cred?.baseUrl) return { ok: false, message: "credential missing baseUrl" };

    const res = await ctx.fetch(`${cred.baseUrl}${API_PATH}/users/self`, {
      headers: { accept: "application/json", authorization: `Bearer ${cred.accessToken}` },
    });
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `Mautic rejected the token (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). The access token may have expired, or the API Credential was deleted or rotated.`,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "Mautic returned 403 — the token authenticated, but this API Credential's " +
          "user account lacks permission to read its own profile. Check the user's role.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no Mautic API at ${cred.baseUrl}${API_PATH} (404) — check the instance URL ` +
          "and that the REST API is enabled (Configuration → API Settings).",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Mautic returned ${res.status}${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }`,
      };
    }
    return { ok: true };
  },

  /** Records the instance and the credential's own user. Never the token. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<MauticCredential>;
    if (!cred?.accessToken || !cred?.baseUrl) return {};

    try {
      const res = await ctx.fetch(`${cred.baseUrl}${API_PATH}/users/self`, {
        headers: { accept: "application/json", authorization: `Bearer ${cred.accessToken}` },
      });
      if (!res.ok) return { baseUrl: cred.baseUrl };
      const body = await res.json().catch(() => null) as {
        username?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      } | null;
      if (!body) return { baseUrl: cred.baseUrl };
      const name = [body.firstName, body.lastName].filter(Boolean).join(" ").trim();
      return {
        baseUrl: cred.baseUrl,
        username: body.username,
        email: body.email,
        user: { name: name || body.username, email: body.email },
      };
    } catch {
      return { baseUrl: cred.baseUrl };
    }
  },
  // No `revoke`: Mautic's REST API documentation states no token-revocation
  // endpoint for the client-credentials grant. Deleting the API Credential in
  // Settings → API Credentials invalidates every token minted from it, but
  // that action is not exposed over the API this app can reach — it is the
  // operator's own step, same as rotating the client secret.
};

export default clientCredentials;
