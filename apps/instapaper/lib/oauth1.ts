/**
 * OAuth 1.0a request signing, HMAC-SHA1 only — the one signature method
 * Instapaper's docs say it supports ("Only the HMAC-SHA1 signature method is
 * supported").
 *
 * ## Why this app signs its own requests instead of using a library
 *
 * The build rules forbid a runtime signing dependency, and `sign` runs in a
 * network-less worker anyway, so the only network-free primitive available is
 * Web Crypto (`crypto.subtle`), which every Deno runtime ships. HMAC-SHA1 is a
 * pure computation — no network call — so it is legal inside `sign`.
 *
 * ## The body IS part of the signature base string
 *
 * Instapaper's overview states "all parameters should be passed in the POST
 * request-body" and "the OAuth parameters should be passed in the
 * Authorization header" — never the query string. RFC 5849 §3.4.1.3 says the
 * signature base string's parameter set is the union of the OAuth parameters
 * and every `application/x-www-form-urlencoded` body parameter. Get this
 * wrong — sign only the OAuth params — and every write (which always carries
 * a body: `bookmark_id`, `url`, `title`, …) gets a signature Instapaper
 * rejects, while bodyless calls happen to still verify. That asymmetry is
 * exactly the kind of bug that passes a smoke test and fails in the field.
 */

/** RFC 3986 percent-encoding — `encodeURIComponent` alone under-encodes `! * ' ( )`. */
export function percentEncode(input: string): string {
  return encodeURIComponent(input).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/** Parse an `application/x-www-form-urlencoded` body into a plain object, for signing. */
export function parseFormBody(body: string | null | undefined): Record<string, string> {
  const params: Record<string, string> = {};
  if (!body) return params;
  for (const [key, value] of new URLSearchParams(body)) params[key] = value;
  return params;
}

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  /** Absent for the two-legged xAuth token-exchange request itself. */
  token?: string;
  tokenSecret?: string;
}

/** Deterministic overrides, used only so tests can assert a fixed signature. */
export interface OAuth1Overrides {
  nonce?: string;
  timestamp?: string;
}

/**
 * Build the `Authorization: OAuth ...` header for one request.
 *
 * `bodyParams` must be exactly the `application/x-www-form-urlencoded` body
 * this request will be sent with (empty object for a bodyless GET-shaped
 * call) — see the module doc above for why that is not optional.
 */
export async function buildOAuth1Header(
  method: string,
  url: string,
  bodyParams: Record<string, string>,
  creds: OAuth1Credentials,
  overrides: OAuth1Overrides = {},
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: overrides.nonce ?? crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: overrides.timestamp ?? String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
  };
  if (creds.token) oauthParams.oauth_token = creds.token;

  const allParams: Record<string, string> = { ...bodyParams, ...oauthParams };
  const normalizedParams = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    percentEncode(url.split("?")[0]),
    percentEncode(normalizedParams),
  ].join("&");

  const signingKey = `${percentEncode(creds.consumerSecret)}&${
    percentEncode(creds.tokenSecret ?? "")
  }`;
  const signature = await hmacSha1Base64(signingKey, baseString);

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  return "OAuth " + Object.keys(headerParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
    .join(", ");
}
