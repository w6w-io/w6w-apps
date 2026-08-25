import type { AuthDefinition } from "@w6w/types";
import { API_HOSTS, TOKEN_PATH } from "../lib/client.ts";

interface StoredCredential {
  apiHost: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

/**
 * `POST {apiHost}/oauth2/token`, `grant_type=password` (mint) or
 * `grant_type=refresh_token` (renew) — both under the same HTTP Basic header.
 *
 * SignNow's OpenAPI contract documents this operation as
 * `consumes: multipart/form-data`, but the sandbox this app runs in stringifies
 * every `ctx.fetch` body with `String(body)` on its way to the network (a
 * `FormData` would serialize to the useless literal `"[object FormData]"`), so
 * a real multipart body cannot survive the trip. `application/x-www-form-urlencoded`
 * — the endpoint's own operation-level `consumes` also lists it, it is what
 * `URLSearchParams#toString()` produces, and it is RFC 6749's own token-endpoint
 * encoding — is used instead and verified live 2026-08-25 to parse identically
 * (same `invalid_client` classification for a bad Basic pair either way).
 */
async function requestToken(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  apiHost: string,
  clientId: string,
  clientSecret: string,
  form: Record<string, string>,
): Promise<TokenResponse> {
  const body = new URLSearchParams(form).toString();

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await ctx.fetch(`https://${apiHost}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const parsed = await res.json().catch(() => ({})) as TokenResponse;
  if (!res.ok || !parsed.access_token) {
    // SignNow answers auth failures with 400, not 401 — the body's `error` is
    // the classifier, e.g. `invalid_client` (bad client id/secret) or
    // `invalid_request` (bad username/password/grant_type combination).
    const reason = parsed.error_description ?? parsed.error ?? `HTTP ${res.status}`;
    throw new Error(`SignNow refused to mint a token (${reason}).`);
  }
  return parsed;
}

function expiresAtFrom(expiresIn: number | undefined): string | undefined {
  if (!expiresIn) return undefined;
  // A minute of headroom absorbs clock skew.
  return new Date(Date.now() + Math.max(expiresIn - 60, 0) * 1000).toISOString();
}

/**
 * Resource Owner Password Credentials grant against a SignNow API
 * application's own token endpoint.
 *
 * This is the grant SignNow documents for a server-side integration that acts
 * as one fixed SignNow account, with no browser redirect: the API application
 * (`clientId`/`clientSecret`, from the account's API Apps page) authenticates
 * itself via HTTP Basic, and the account's own `username`/`password` stand in
 * for user consent. The **authorization_code** grant the same token endpoint
 * documents is not implemented here — see `lib/client.ts` for why.
 */
const oauth2Password: AuthDefinition = {
  key: "oauth2-password",
  type: "custom",
  displayName: "SignNow Account (API App)",
  description:
    "A SignNow API application's Client ID/Secret, plus the SignNow account (email + password) " +
    "this connection acts as. SignNow's server-to-server grant — no browser sign-in.",
  connectionLabel: "{{email}} ({{apiHost}})",
  fields: [
    {
      key: "apiHost",
      label: "API Environment",
      type: "select",
      required: true,
      default: API_HOSTS.production,
      options: [
        { value: API_HOSTS.production, label: "Production (api.signnow.com)" },
        {
          value: API_HOSTS.eval,
          label: "Free trial / eval account (api-eval.signnow.com)",
        },
      ],
      hint:
        "A free trial developer account (created at signnow.com/developers before subscribing) " +
        "lives on api-eval.signnow.com — a different user base than production, not a toggle on " +
        "the same account. Using the wrong one answers with an ordinary invalid-credential error.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "SignNow Settings → API Apps (Basic auth username for the token endpoint).",
    },
    { key: "clientSecret", label: "Client Secret", type: "secret", required: true, row: "client" },
    {
      key: "username",
      label: "Account Email",
      type: "string",
      required: true,
      row: "account",
      hint: "The SignNow account this connection signs in as.",
    },
    { key: "password", label: "Account Password", type: "secret", required: true, row: "account" },
  ],

  async exchange({ fields }, ctx) {
    const { apiHost, clientId, clientSecret, username, password } = (fields ?? {}) as Record<
      string,
      string
    >;
    if (!apiHost || !clientId || !clientSecret || !username || !password) {
      throw new Error(
        "API Environment, Client ID, Client Secret, Account Email and Account Password are all " +
          "required.",
      );
    }
    const token = await requestToken(ctx, apiHost, clientId, clientSecret, {
      grant_type: "password",
      username,
      password,
    });
    const credential: StoredCredential = {
      apiHost,
      clientId,
      clientSecret,
      accessToken: token.access_token!,
      refreshToken: token.refresh_token,
      expiresAt: expiresAtFrom(token.expires_in),
    };
    return credential;
  },

  async refresh({ credential }, ctx) {
    const { apiHost, clientId, clientSecret, refreshToken } = credential as StoredCredential;
    if (!refreshToken) {
      throw new Error("SignNow issued no refresh_token for this connection — reconnect instead.");
    }
    const token = await requestToken(ctx, apiHost, clientId, clientSecret, {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const updated: StoredCredential = {
      apiHost,
      clientId,
      clientSecret,
      accessToken: token.access_token!,
      // SignNow does not always reissue a refresh_token on renewal — keep the
      // old one when it doesn't.
      refreshToken: token.refresh_token ?? refreshToken,
      expiresAt: expiresAtFrom(token.expires_in),
    };
    return updated;
  },

  sign({ request, credential }) {
    const { accessToken } = credential as StoredCredential;
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /user` — the account's own profile. Chosen over `GET /oauth2/token`
   * (SignNow's token-verify endpoint), which would echo the caller's own
   * access token back in the response body — exactly the shape this pack
   * refuses to use as a credential probe. `GET /user` needs no scope beyond
   * "is this a valid token for some account" and returns nothing the caller
   * didn't already have.
   *
   * SignNow answers a missing or invalid token with **HTTP 400** and
   * `{"error":"invalid_token","code":1537}` (verified live 2026-08-25) — not
   * 401 — so the body's `error` field is what this checks, not the status.
   */
  async test({ credential }, ctx) {
    const { apiHost, accessToken } = credential as StoredCredential;
    if (!accessToken) return { ok: false, message: "credential has no accessToken" };
    const res = await ctx.fetch(`https://${apiHost}/user`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      return {
        ok: false,
        message: body.error
          ? `SignNow rejected the token: ${body.error}`
          : `SignNow ${apiHost}/user returned ${res.status}`,
      };
    }
    await res.body?.cancel();
    return { ok: true };
  },

  /** Records the API host every action needs, and the account email for the label. */
  async afterConnect({ credential }, ctx) {
    const { apiHost, accessToken } = credential as StoredCredential;
    const res = await ctx.fetch(`https://${apiHost}/user`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) {
      await res.body?.cancel();
      return { apiHost };
    }
    const info = await res.json().catch(() => ({})) as {
      id?: string;
      primary_email?: string;
      first_name?: string;
      last_name?: string;
    };
    return {
      apiHost,
      userId: info.id,
      email: info.primary_email,
      name: [info.first_name, info.last_name].filter(Boolean).join(" ") || undefined,
    };
  },
};

export default oauth2Password;
