import type { AuthDefinition } from "@w6w/types";
import { mintClientCredentialsToken, probeWithToken, scrub, TokenError } from "./token.ts";

/**
 * Harvest v3 OAuth 2.0 **client credentials** — the path Greenhouse intends a
 * customer-built integration to use, and the only one that survives the v1/v2
 * sunset on 31 August 2026.
 *
 * Verified against Greenhouse's Harvest v3 Authentication guide and the
 * `auth-api` OpenAPI 3.1 document (both read 2026-08-11), plus live probes of
 * `auth.greenhouse.io/token`.
 *
 * ## Getting the credential is self-serve
 *
 * The customer opens API Credentials in Greenhouse, creates a new credential,
 * picks **Harvest V3 (OAuth)**, chooses scopes, and is shown a Client ID and
 * Client Secret. No partner registration, no Greenhouse approval, no redirect
 * URI. That is why this app ships client credentials rather than the
 * authorization-code flow, which Greenhouse reserves for listed partners
 * integrating with *mutual* customers and gates behind Partner Support.
 *
 * ## `type: "custom"`, not `"oauth2"`
 *
 * The spec's `oauth2` type models the browser authorization-code flow
 * (`authorizationUrl` + PKCE + a redirect). This is the machine-to-machine
 * grant: no browser round trip, which is precisely what keeps it working in
 * scheduled and background runs. Same shape as `paypal` and `kajabi` in this
 * pack.
 *
 * The client id and secret are kept inside the stored credential because
 * `refresh` and `test` both need them — an access token here is short-lived
 * (the documented example is 3600 seconds) and there is no refresh token in the
 * client-credentials grant, so renewal means running the same exchange again.
 *
 * ## `sub` decides what the integration can see
 *
 * A client-credentials token acts as a Greenhouse *user*. Left unset, that user
 * is an auto-created integration service user (ISU) attached to the credential.
 * Set `sub` to a numeric Greenhouse user id to act as a real person instead.
 *
 * This is not cosmetic. Greenhouse's own list-endpoints guide states: "GET
 * endpoints are only accessible by site admin users. All other user types will
 * not return results." So a `sub` pointing at a non-admin produces 403s — or
 * worse, empty results — from every read in this app, with a credential that is
 * otherwise perfectly valid. The field's hint says so, and `test` reports a 403
 * as a live credential with limited reach rather than as a bad one.
 */

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
  sub?: string;
  accessToken?: string;
  expiresAt?: string;
}

function read(source: unknown): ClientCredentials {
  const raw = (source ?? {}) as Record<string, unknown>;
  return {
    clientId: String(raw.clientId ?? "").trim(),
    clientSecret: String(raw.clientSecret ?? "").trim(),
    sub: String(raw.sub ?? "").trim() || undefined,
    accessToken: typeof raw.accessToken === "string" ? raw.accessToken : undefined,
    expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : undefined,
  };
}

const oauthClientCredentials: AuthDefinition = {
  key: "oauth-client-credentials",
  type: "custom",
  displayName: "Harvest V3 (OAuth)",
  description:
    "In Greenhouse, open API Credentials, create a new credential, choose Harvest V3 (OAuth), " +
    "grant the scopes your workflows need, then paste the Client ID and Client Secret here. " +
    "No browser sign-in, so it keeps working in scheduled runs.",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "client",
      hint: "Shown once when you create the credential. It ends in a `-<number>` suffix that " +
        "Greenhouse appends; copy the whole string rather than retyping it.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "client",
      hint: "Rotating a secret in Greenhouse keeps the old one alive for up to a week, so a " +
        "rotation does not break this connection immediately — but do update it.",
    },
    {
      key: "sub",
      label: "Act as user id",
      type: "string",
      hint: "Numeric Greenhouse user id this integration acts as — the number in the URL when " +
        "you open the user in Greenhouse. Leave empty to act as the integration service user " +
        "created with the credential. Greenhouse serves its list endpoints ONLY to Site Admin " +
        "users, so a non-admin id here makes every read in this app fail or come back empty.",
    },
  ],

  /** Turns the pasted values into a live v3 bearer token at connect time. */
  async exchange({ fields }, ctx) {
    const creds = read(fields);
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error("Client ID and Client Secret are both required.");
    }
    const token = await mintClientCredentialsToken(ctx, creds);
    return { ...creds, ...token };
  },

  /**
   * The same exchange again. The client id and secret do not expire; only the
   * access token does, and the client-credentials grant issues no refresh token
   * to trade in.
   */
  refresh({ credential }, ctx) {
    const creds = read(credential);
    return mintClientCredentialsToken(ctx, creds).then((token) => ({ ...creds, ...token }));
  },

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the bearer token and returns. Nothing is derived from the token here — it is
   * passed through exactly as Greenhouse minted it.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * Mint a token, then use it. Both halves matter: minting proves the client
   * id/secret pair is live, and the probe proves Greenhouse will accept what it
   * minted. See `probeWithToken` for why a 403 there is a pass.
   *
   * Every message returned from here is passed through `scrub`, because
   * Greenhouse's own rejection message for a malformed client id quotes the
   * client id back (`client_id=… does not contain a valid client ID suffix`) and
   * a `test` result is stored and displayed.
   */
  async test({ credential }, ctx) {
    const creds = read(credential);
    const secrets = [creds.clientId, creds.clientSecret];
    if (!creds.clientId || !creds.clientSecret) {
      return { ok: false, message: "credential is missing clientId or clientSecret — reconnect" };
    }
    try {
      const { accessToken } = await mintClientCredentialsToken(ctx, creds);
      const result = await probeWithToken(ctx, accessToken);
      return result.message
        ? { ok: result.ok, message: scrub(result.message, secrets) }
        : { ok: result.ok };
    } catch (error) {
      const message = error instanceof TokenError
        ? error.message
        : error instanceof Error
        ? error.message
        : String(error);
      return { ok: false, message: scrub(message, secrets) };
    }
  },
};

export default oauthClientCredentials;
