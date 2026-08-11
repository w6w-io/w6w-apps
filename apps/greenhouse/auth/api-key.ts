import type { AuthDefinition } from "@w6w/types";
import { mintTransitionToken, probeWithToken, scrub, TokenError } from "./token.ts";

/**
 * A v1/v2 **Harvest API key**, exchanged for a v3 bearer token through
 * Greenhouse's own transition endpoint.
 *
 * Verified against the Harvest v3 Authentication guide, the `harvest-api`
 * OpenAPI 3.1 document's `POST /auth/token` operation, and the v1 reference at
 * `developers.greenhouse.io/harvest.html` (all read 2026-08-11), plus live
 * probes of `harvest.greenhouse.io`.
 *
 * ## Why this method exists at all
 *
 * Most Greenhouse customers already hold a Harvest API key — it is what every
 * v1/v2 integration has used for a decade, and it is created in a different
 * screen (Dev Center › API Credential Management) from the v3 OAuth credential.
 * Requiring a brand-new OAuth credential before anyone can connect would be a
 * needless wall, so this method takes the key they already have. It calls the
 * **same v3 endpoints** as the OAuth method: the key never goes on a v1 request.
 *
 * ## Why it is not the recommended method
 *
 * Greenhouse's own OpenAPI description of `POST /auth/token` is unambiguous:
 *
 *   > "This endpoint is only accessible with Harvest API keys (non-OAuth) to
 *   > support migrations into Harvest v3. We will deprecate this endpoint when
 *   > Harvest v1/v2 is deprecated."
 *
 * and the Authentication guide adds: "After v1 and v2 endpoints are deprecated,
 * OAuth will be the only supported authentication method for the Harvest API."
 * The v1/v2 removal date on the vendor's own banner is **31 August 2026**. So
 * this method has a stated end-of-life, and a connection made with it should be
 * replaced by an `oauth-client-credentials` one before then. `README.md` says so
 * and the `displayName` below says so where a user actually reads it.
 *
 * ## The trailing colon is the credential
 *
 * v1 Basic auth puts the API key in the *username* position with an **empty**
 * password — the vendor's sample is `curl --user 'V1_V2_HARVEST_API_KEY:'`, and
 * its own prose spells it out: "Since only a username needs to be provided in
 * our case, you'll need to append a `:` (colon) to your Greenhouse API token and
 * then Base64 encode the resulting string." The payload is `base64("key:")`,
 * not `base64("key")` and not `base64("key:x")` — which is what `bamboohr` in
 * this same pack sends, one character apart on the wire and not interchangeable.
 * `auth/token.ts#basicPayload` builds it in one place and
 * `tests/auth/api-key.test.ts` pins the result against the vendor's own sample.
 *
 * ## An API key is all-or-nothing per endpoint
 *
 * Harvest keys carry per-endpoint permissions, granted in Dev Center. The v1
 * reference is blunt about the consequence: "Users with Harvest API keys may
 * access all the data in the endpoint. Access to data in Harvest is binary:
 * everything or nothing." A key permitted on jobs but not candidates is a
 * completely normal, recommended configuration — so a 403 from this connection
 * means "not permitted here", never "bad key", and `test` reports it as a pass.
 */

export interface ApiKeyCredential {
  apiKey: string;
  sub?: string;
  accessToken?: string;
  expiresAt?: string;
}

function read(source: unknown): ApiKeyCredential {
  const raw = (source ?? {}) as Record<string, unknown>;
  return {
    apiKey: String(raw.apiKey ?? "").trim(),
    sub: String(raw.sub ?? "").trim() || undefined,
    accessToken: typeof raw.accessToken === "string" ? raw.accessToken : undefined,
    expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : undefined,
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "Harvest API Key (transitional)",
  description:
    "Paste an existing Harvest API key from Dev Center › API Credential Management. It is " +
    "exchanged for a Harvest v3 token on every use, so this connection calls v3 like the OAuth " +
    "one does. Greenhouse retires this exchange together with the v1/v2 API on 31 August 2026 — " +
    "prefer Harvest V3 (OAuth) for anything long-lived.",
  fields: [
    {
      key: "apiKey",
      label: "Harvest API Key",
      type: "secret",
      required: true,
      hint: "Created under Configure › Dev Center › API Credential Management by a user holding " +
        'the "Can manage ALL organization\'s API Credentials" developer permission. Grant it ' +
        "only the endpoint permissions your workflows need — Greenhouse's own guidance, since " +
        "access within a permitted endpoint is all-or-nothing.",
    },
    {
      key: "sub",
      label: "Act as user id",
      type: "string",
      hint: "Optional numeric Greenhouse user id the minted token acts as. Leave empty to use " +
        "the key's own service user. Greenhouse serves its v3 list endpoints ONLY to Site Admin " +
        "users, so a non-admin id here makes every read fail or come back empty.",
    },
  ],

  /** Exchanges the key for a v3 bearer token at connect time. */
  async exchange({ fields }, ctx) {
    const creds = read(fields);
    if (!creds.apiKey) throw new Error("A Harvest API key is required.");
    const token = await mintTransitionToken(ctx, creds);
    return { ...creds, ...token };
  },

  /** The same exchange again — the key does not expire, only the minted token does. */
  refresh({ credential }, ctx) {
    const creds = read(credential);
    return mintTransitionToken(ctx, creds).then((token) => ({ ...creds, ...token }));
  },

  /**
   * The only hook handed the raw credential, and it runs network-less. Note what
   * it does NOT send: the API key itself never reaches a Harvest resource
   * request, only the token minted from it.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * Mint, then use. A 403 from the probe is a pass — see `probeWithToken`.
   *
   * Messages are scrubbed of the key before they leave: the transition endpoint
   * answers a bad key with `{"message":"Invalid credentials"}` today, which
   * quotes nothing, but a stored health message is the wrong place to discover
   * that a vendor started echoing input.
   */
  async test({ credential }, ctx) {
    const creds = read(credential);
    if (!creds.apiKey) return { ok: false, message: "credential is missing apiKey — reconnect" };
    try {
      const { accessToken } = await mintTransitionToken(ctx, creds);
      const result = await probeWithToken(ctx, accessToken);
      return result.message
        ? { ok: result.ok, message: scrub(result.message, [creds.apiKey]) }
        : { ok: result.ok };
    } catch (error) {
      const message = error instanceof TokenError
        ? error.message
        : error instanceof Error
        ? error.message
        : String(error);
      return { ok: false, message: scrub(message, [creds.apiKey]) };
    }
  },
};

export default apiKey;
