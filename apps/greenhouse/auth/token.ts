import type { HookContext } from "@w6w/types";
import { API_BASE, API_PREFIX, AUTH_BASE } from "../lib/client.ts";

/**
 * The two ways to mint a Harvest **v3** bearer token, and the one place either
 * wire format is built.
 *
 * Harvest v3 accepts exactly one thing on a resource request: a JWT bearer
 * token. Nothing else — the OpenAPI document's global `security` is
 * `[{ "bearer": [] }]`, and an unauthenticated `GET /v3/candidates` answers
 * `401 {"message":"Unauthorized","errors":["Token could not be decoded. Please
 * ensure your token is from a trusted source."]}` (measured 2026-08-11). So both
 * Auth methods in this app do the same thing in the end: obtain a JWT, then
 * stamp it. They differ only in what they present to get one.
 *
 * ## Two token endpoints, two response shapes
 *
 * | Endpoint                                | Presents           | Returns            |
 * | --------------------------------------- | ------------------ | ------------------ |
 * | `auth.greenhouse.io/token`              | OAuth client creds | `expires_in` (int) |
 * | `harvest.greenhouse.io/auth/token`      | v1/v2 API key      | `expires` (string) |
 *
 * The **TTL field is named differently on the two endpoints**, which is the kind
 * of thing that produces a connection that works for an hour and then silently
 * stops refreshing. {@link expiresAtFrom} reads both and falls back to the
 * documented one-hour example when neither is usable, so a token is always
 * refreshed early rather than never.
 *
 * ## Rejection is not one status code
 *
 * Measured against `auth.greenhouse.io/token` on 2026-08-11, with no valid
 * credential in existence:
 *
 * | Sent                                      | Status | Body                                                    |
 * | ----------------------------------------- | ------ | ------------------------------------------------------- |
 * | nothing                                   | 401    | `{"message":"Unauthorized","errorId":"err-…"}`          |
 * | client id `notaclient`                    | 400    | `{"message":"client_id=notaclient does not contain a valid client ID suffix","errorId":"err-…"}` |
 * | well-formed but unknown client id/secret  | 401    | `{"error":"invalid_client"}`                            |
 * | no `grant_type`                           | 400    | ``{"message":"Must include `grant_type` parameter…"}``   |
 * | `grant_type=not_a_grant`                  | 400    | `{"message":"grant_type=not_a_grant is invalid, please use one of: authorization_code, refresh_token, client_credentials, urn:ietf:params:oauth:grant-type:token-exchange"}` |
 *
 * A rejected credential is therefore **400 in one case and 401 in another**, and
 * the body is `{error}` (RFC 6749) in one case and `{message, errorId}`
 * (Greenhouse's own) in the others. Classifying by status code alone would call
 * a malformed client id a server problem and a missing credential a bad one.
 * {@link classifyTokenFailure} reads the body.
 *
 * ## The error message can contain your client id
 *
 * `client_id=notaclient does not contain a valid client ID suffix` echoes the
 * caller's client id back verbatim. A `test` result is stored and rendered in
 * the health surface, so passing a vendor message through unfiltered would copy
 * half a credential into it on every failed check. {@link scrub} removes every
 * secret this app holds from any string before it leaves these hooks — driven by
 * the values themselves, not by a pattern, so it keeps working when Greenhouse
 * rewords the message.
 */

/** What both endpoints hand back, normalised. */
export interface MintedToken {
  accessToken: string;
  /** ISO 8601, one minute before the real expiry to absorb clock skew. */
  expiresAt: string;
}

interface TokenResponseBody {
  token_type?: string;
  access_token?: string;
  /** `auth.greenhouse.io/token` — seconds. The example is 3600. */
  expires_in?: number;
  /** `harvest.greenhouse.io/auth/token` — declared as a string, format unstated. */
  expires?: string;
  error?: string;
  error_description?: string;
  message?: string;
  errorId?: string;
}

/** Documented example TTL, used when neither TTL field is readable. */
export const FALLBACK_TTL_SECONDS = 3600;

/** Renew this many seconds early, to absorb clock skew and request latency. */
export const RENEW_HEADROOM_SECONDS = 60;

/**
 * Base64 a `user:password` pair for HTTP Basic.
 *
 * Inlined rather than imported: the app sandbox runs without import access, so
 * `jsr:@std/encoding` is not reachable at run time.
 */
export function basicPayload(user: string, password: string): string {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Remove every secret this app holds from a string.
 *
 * Value-driven on purpose. A regex tuned to today's wording
 * (`client_id=… does not contain a valid client ID suffix`) stops working the
 * day Greenhouse rewrites the sentence, and the failure mode of that is a
 * credential in a stored health report. Matching the literal values cannot drift.
 */
export function scrub(text: string, secrets: Array<string | undefined>): string {
  let out = text;
  for (const secret of secrets) {
    const value = (secret ?? "").trim();
    if (value.length < 4) continue;
    out = out.split(value).join("<redacted>");
  }
  return out;
}

/**
 * Work out when a minted token stops being usable.
 *
 * `expires_in` (OAuth, seconds) is preferred. `expires` (transition endpoint) is
 * declared only as `type: "string"` with no format, so both readings are tried —
 * a number of seconds, then a parseable date — and anything else falls back to
 * the documented one-hour example. Erring toward a *shorter* life is the safe
 * direction: minting again early costs one request, believing a dead token costs
 * every request until someone notices.
 */
export function expiresAtFrom(body: TokenResponseBody, now: number = Date.now()): string {
  const seconds = (() => {
    if (typeof body.expires_in === "number" && Number.isFinite(body.expires_in)) {
      return body.expires_in;
    }
    const raw = (body.expires ?? "").trim();
    if (raw) {
      const asNumber = Number(raw);
      if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
      const asDate = Date.parse(raw);
      if (Number.isFinite(asDate)) return Math.max(0, (asDate - now) / 1000);
    }
    return FALLBACK_TTL_SECONDS;
  })();
  const lifetime = Math.max(0, seconds - RENEW_HEADROOM_SECONDS);
  return new Date(now + lifetime * 1000).toISOString();
}

/**
 * Turn a failed token response into an operator-readable cause, from the BODY.
 *
 * The status code is reported but never decides: a rejected client id arrives as
 * 400 and a rejected client secret as 401, so a status-code classifier would
 * describe the first as an outage.
 */
export function classifyTokenFailure(status: number, body: TokenResponseBody | null): string {
  const oauthError = (body?.error ?? "").trim();
  const message = (body?.message ?? "").trim();

  if (oauthError === "invalid_client") {
    return "Greenhouse rejected the credential (invalid_client): the client id exists in the " +
      "right shape but the id/secret pair is not recognised. Check the secret was copied whole, " +
      "and that it has not been rotated out in Greenhouse's API Credentials screen.";
  }
  if (oauthError) return `Greenhouse returned OAuth error \`${oauthError}\`.`;
  if (/valid client ID suffix/i.test(message)) {
    return "The client id is not a Greenhouse client id — it is missing the trailing `-<n>` " +
      "suffix Greenhouse appends. Copy it again from API Credentials; do not retype it.";
  }
  if (/must include .?grant_type/i.test(message) || /grant_type=.* is invalid/i.test(message)) {
    return `Greenhouse rejected the grant type, which is this app's bug rather than yours: ${message}`;
  }
  if (/^unauthorized$/i.test(message)) {
    return "Greenhouse saw no credential on the token request. The connection did not carry one " +
      "— reconnect it.";
  }
  if (/invalid credentials/i.test(message)) {
    return "Greenhouse rejected the Harvest API key. Check it was copied exactly and has not " +
      "been deleted in Dev Center › API Credential Management.";
  }
  if (message) return `Greenhouse refused the token request (HTTP ${status}): ${message}`;
  return `Greenhouse refused the token request (HTTP ${status}) with no readable body.`;
}

/** Thrown by the mint helpers so `test` can report a cause without a second parse. */
export class TokenError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "TokenError";
  }
}

async function mint(
  ctx: HookContext,
  url: string,
  basic: string,
  init: { body: string; contentType: string },
  secrets: Array<string | undefined>,
): Promise<MintedToken> {
  const res = await ctx.fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": init.contentType,
      accept: "application/json",
    },
    body: init.body,
  });

  const raw = await res.text().catch(() => "");
  let body: TokenResponseBody | null = null;
  try {
    body = raw ? JSON.parse(raw) as TokenResponseBody : null;
  } catch { /* not JSON — classifyTokenFailure copes with an empty body */ }

  if (!res.ok || !body?.access_token) {
    const cause = res.ok
      ? "Greenhouse answered the token request without an access_token."
      : classifyTokenFailure(res.status, body);
    throw new TokenError(res.status, scrub(cause, secrets));
  }

  return { accessToken: body.access_token, expiresAt: expiresAtFrom(body) };
}

/**
 * OAuth 2.0 client credentials — the durable path.
 *
 * `grant_type` is sent in a form-encoded body, following the Authentication
 * guide's own worked `curl` (`--data 'grant_type=client_credentials&sub=USER_ID'`)
 * rather than the OpenAPI document, which places `grant_type` in the query
 * string and `sub` in a JSON body. The two vendor documents disagree; both
 * spellings of `grant_type` were observed accepted on 2026-08-11 (each reached
 * client validation rather than a grant-type error), but only the guide shows
 * `sub`, so the guide's form is the one this app sends.
 */
export function mintClientCredentialsToken(
  ctx: HookContext,
  creds: { clientId: string; clientSecret: string; sub?: number | string },
): Promise<MintedToken> {
  const form = new URLSearchParams({ grant_type: "client_credentials" });
  const sub = String(creds.sub ?? "").trim();
  if (sub) form.set("sub", sub);
  return mint(
    ctx,
    `${AUTH_BASE}/token`,
    basicPayload(creds.clientId, creds.clientSecret),
    { body: form.toString(), contentType: "application/x-www-form-urlencoded" },
    [creds.clientId, creds.clientSecret],
  );
}

/**
 * The v1/v2 → v3 transition endpoint.
 *
 * HTTP Basic with the Harvest API key as the username and an **empty** password
 * — the trailing colon in the vendor's `curl --user 'V1_V2_HARVEST_API_KEY:'` is
 * the whole point, and dropping it changes the base64 payload.
 */
export function mintTransitionToken(
  ctx: HookContext,
  creds: { apiKey: string; sub?: number | string },
): Promise<MintedToken> {
  const sub = String(creds.sub ?? "").trim();
  return mint(
    ctx,
    `${API_BASE}/auth/token`,
    basicPayload(creds.apiKey, ""),
    {
      body: JSON.stringify(sub ? { sub: Number(sub) } : {}),
      contentType: "application/json",
    },
    [creds.apiKey],
  );
}

/**
 * The endpoint a freshly minted token is proved against, and why this one.
 *
 * `GET /v3/user_roles?per_page=1` is the smallest read in the covered surface: a
 * short organisation-level dictionary of role names, no parent resource, no
 * per-record cost.
 *
 * What makes it a safe probe is not the endpoint, though — it is how the answer
 * is read. Harvest v3 authorises in two independent layers: the JWT must decode
 * (401 if it does not) and the granted scopes plus the acting user's Greenhouse
 * permissions must cover the call (403 if they do not). Every v3 list endpoint
 * additionally requires the acting user to be a **Site Admin**. So a perfectly
 * live credential can legitimately answer 403 here, and treating that as failure
 * would report a working connection as broken — which is exactly what a probe on
 * `/v3/candidates` would do to an integration scoped to jobs.
 *
 * A 403 is therefore a **pass**: it proves the token decoded, which is the only
 * question `test` is asking. Whether a given Action is permitted is that
 * Action's own 403 to report, with the message `formatHarvestError` writes.
 */
export const PROBE_URL = `${API_BASE}${API_PREFIX}/user_roles?per_page=1`;

/** The outcome of {@link probeWithToken}, kept separate from its phrasing. */
export interface ProbeResult {
  ok: boolean;
  message?: string;
}

/**
 * Call {@link PROBE_URL} with a freshly minted token and interpret the answer.
 *
 * The token is passed in rather than read from a stored credential so that
 * `test` always proves the *whole* chain — mint, then use — instead of proving
 * that a token cached at connect time used to work.
 */
export async function probeWithToken(
  ctx: HookContext,
  accessToken: string,
): Promise<ProbeResult> {
  const res = await ctx.fetch(PROBE_URL, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
  });
  if (res.ok) return { ok: true };

  const body = await res.json().catch(() => null) as
    | { message?: string; errors?: unknown }
    | null;

  if (res.status === 403) {
    return {
      ok: true,
      message:
        "Credential is live. Greenhouse refused this connection's user-roles read (403), which " +
        "means the granted scopes or the acting Greenhouse user do not cover it — note that " +
        "every v3 GET requires a Site Admin subject. Actions outside those scopes will fail the " +
        "same way.",
    };
  }
  if (res.status === 401) {
    return {
      ok: false,
      message:
        "Greenhouse minted a token but then refused it (401). That usually means the client " +
        "application was disabled or its organisation deactivated between the two calls.",
    };
  }
  if (res.status === 404) {
    return {
      ok: false,
      message: "Greenhouse answered 404 for GET /v3/user_roles. Harvest v3 routes before it " +
        "authenticates, so a 404 on a documented path means the endpoint is gone, not that the " +
        "credential is wrong.",
    };
  }
  return {
    ok: false,
    message: `Greenhouse returned HTTP ${res.status} for the user-roles probe${
      body?.message ? `: ${body.message}` : ""
    }`,
  };
}
