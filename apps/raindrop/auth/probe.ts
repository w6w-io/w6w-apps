/**
 * The credential-liveness probe, shared by both auth methods.
 *
 * ## The endpoint: `GET /rest/v1/user`
 *
 * Chosen by reading the documented response *schema* field by field and by
 * measuring the wire on 2026-08-11 — not by its name.
 *
 * **(a) It requires a credential.** Unauthenticated it answers `401`
 * `{"result":false,"status":401,"errorMessage":"Unauthorized","auth":false}`
 * (72 bytes, measured live). Every other endpoint in this app's surface behaves
 * the same, so there is no ElevenLabs-`/v1/voices` or Apify-`/v2/store` trap
 * here — but there is no *public* endpoint to accidentally probe either, and
 * this one is the cheapest documented read.
 *
 * **(b) It returns no credential material.** This is the check that matters,
 * because a whoami is exactly where an API tends to hand your own key back
 * (Mailjet's `/apikey`, Follow Up Boss's `/me`, ElevenLabs' `/v1/user` all do).
 * Raindrop's User schema was walked in full — `_id`, `config`, `email`,
 * `email_MD5`, `files.{used,size,lastCheckPoint}`, `fullName`, `groups`,
 * `password`, `pro`, `proExpire`, `registered`, and the six
 * `<provider>.enabled` booleans. The one alarming name is **`password`, and it
 * is a `Boolean`** — "Does user have a password" — not a password. No access
 * token, refresh token, API key or secret appears anywhere in the schema.
 *
 * The response does carry the account's own `email`, so neither this probe nor
 * the `quota` check ever returns the body: `test` returns `{ok, message}` and
 * `health/quota.ts` returns numbers.
 *
 * **(c) It is not scope-restricted.** Raindrop's OAuth has no `scope` parameter
 * at all — the authorization request takes `client_id`, `redirect_uri` and
 * `response_type` and nothing else — so there is no such thing as a token
 * entitled to raindrops but not to its own account. The HubSpot/Shopify failure
 * mode, where a probe needs a permission a good credential may legitimately
 * lack, cannot arise.
 *
 * ## The verdict comes from the body, never the status code
 *
 * Raindrop returns `401` for both "no credential arrived" and "credential
 * rejected", and the two are only distinguishable in `errorMessage` — measured
 * the same day, on the same endpoint:
 *
 *   | Request                       | Status | Body                                        |
 *   | ----------------------------- | ------ | ------------------------------------------- |
 *   | no `Authorization` header     | 401    | `…"errorMessage":"Unauthorized"…`           |
 *   | `Authorization: Bearer bogus` | 401    | `…"errorMessage":"Incorrect access_token"…` |
 *
 * They are different problems with different fixes — the first means the
 * credential never reached the request (reconnect), the second means the token
 * itself is wrong or revoked (re-issue it) — and collapsing them into "HTTP 401"
 * is how a wiring bug gets reported as an expired token.
 *
 * The status code alone is not even sufficient for *success*: Raindrop's OAuth
 * token endpoint answers `200` carrying `{"result": false, "status": 400}`
 * (measured), so `res.ok` is treated as necessary and not sufficient everywhere
 * in this app, and `result === false` is checked on its own.
 */

/** `GET /rest/v1/user` — see the module comment for the four reasons. */
export const PROBE_PATH = "/user";

/** The two 401 bodies Raindrop distinguishes, as the vendor spells them. */
export const MISSING_CREDENTIAL_MESSAGE = "Unauthorized";
export const REJECTED_CREDENTIAL_MESSAGE = "Incorrect access_token";

interface ProbeBody {
  result?: boolean;
  status?: number;
  errorMessage?: string;
  auth?: boolean;
  user?: { _id?: number };
}

/**
 * Turn a probe response into `{ok, message}`.
 *
 * Exported and pure so both auth methods classify identically and so the
 * classification is testable without a fetch — the arithmetic here is what
 * decides whether a user is told to reconnect or to re-issue a token.
 *
 * `label` names the credential in the advice ("test token" / "access token"),
 * because the remedy differs: one is re-copied from the console, the other is
 * re-authorized.
 */
export function classifyProbe(
  status: number,
  body: unknown,
  label: string,
): { ok: boolean; message?: string } {
  const parsed = (body ?? null) as ProbeBody | null;
  const vendorMessage = parsed?.errorMessage;

  // Success is `2xx` AND the envelope's own verdict AND the payload actually
  // being a user. A 200 whose body says `result: false` is a failure the status
  // code did not report, and this app has measured that shape on the wire.
  if (status >= 200 && status < 300) {
    if (parsed?.result === false) {
      return {
        ok: false,
        message: `Raindrop answered HTTP ${status} but the body reports failure` +
          `${vendorMessage ? `: ${vendorMessage}` : ""}`,
      };
    }
    if (!parsed?.user) {
      return {
        ok: false,
        message: `Raindrop answered HTTP ${status} without a user object — ` +
          "the response was not the documented shape for GET /rest/v1/user",
      };
    }
    return { ok: true };
  }

  if (status === 401) {
    if (vendorMessage === REJECTED_CREDENTIAL_MESSAGE) {
      return {
        ok: false,
        message: `Raindrop rejected the ${label} ("${REJECTED_CREDENTIAL_MESSAGE}"). Check it ` +
          "was copied exactly and has not been revoked or expired.",
      };
    }
    if (vendorMessage === MISSING_CREDENTIAL_MESSAGE) {
      return {
        ok: false,
        message: `Raindrop received no credential ("${MISSING_CREDENTIAL_MESSAGE}") — the ` +
          `${label} did not reach the request. Reconnect this connection.`,
      };
    }
    return {
      ok: false,
      message: `Raindrop returned 401${vendorMessage ? `: ${vendorMessage}` : ""}`,
    };
  }

  if (status === 429) {
    // A rate limit is not a verdict on the credential — Raindrop meters 120
    // requests/minute per authenticated user — so this reports "could not
    // determine" rather than pronouncing a working token dead.
    return {
      ok: false,
      message: "Raindrop rate-limited the check (429), so the credential could not be verified. " +
        "The limit is 120 requests/minute per user; try again shortly.",
    };
  }

  return {
    ok: false,
    message: `Raindrop returned HTTP ${status} for ${PROBE_PATH}` +
      `${vendorMessage ? `: ${vendorMessage}` : ""}`,
  };
}
