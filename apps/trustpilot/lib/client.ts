import type { HookContext } from "@w6w/types";

/**
 * Trustpilot REST client.
 *
 * Everything in this module was verified on 2026-09-01 against Trustpilot's own
 * developer documentation (`developers.trustpilot.com`) — the Authentication overview,
 * the Client Credentials grant page, the Business Units API, the Product Reviews API,
 * the Invitations API, Rate limiting best practices and Common error messages pages —
 * plus a live fetch of the public docs site. Nothing here came from a third-party
 * integration directory.
 *
 * ## Two hosts, not one
 *
 * This is the finding that costs the most time. Trustpilot's reference splits its API
 * across **two** origins, and the docs site itself names both in its 404 troubleshooting
 * row ("an incorrect URL (a base URL that isn't `api.trustpilot.com` or
 * `invitations-api.trustpilot.com`)"):
 *
 *  - **`api.trustpilot.com`** — Business Units API, Product Reviews API, Service Reviews
 *    API, Categories API, Consumer API. Everything in `actions/business-unit-*.ts` and
 *    `actions/product-review-*.ts` calls this host.
 *  - **`invitations-api.trustpilot.com`** — the Invitations API, exclusively. Every action
 *    in `actions/invitation-*.ts` calls this host instead. It is easy to miss because the
 *    Invitations *overview* page is served from `developers.trustpilot.com` alongside
 *    everything else, and only the endpoint reference pages show the different origin.
 *
 * ## Two authentication stories, not one
 *
 * "You can access public APIs with only your API key (Client ID)... if you want to
 * access private APIs you need to use OAuth 2.0" (Authentication overview). Concretely:
 *
 *  - **Public endpoints** (nearly everything under Business Units and Product Reviews)
 *    take a bare `apikey: <key>` header — no token, no expiry, nothing to refresh. See
 *    `auth/api-key.ts`.
 *  - **Private endpoints** (the whole Invitations API, plus a handful of Business
 *    Units/Product Reviews endpoints this app does not cover — private reviews,
 *    conversations) need `Authorization: Bearer <access_token>`, minted via OAuth 2.0.
 *    This app uses the **Client Credentials** grant specifically because it is the one
 *    documented flow that needs no browser and no end-user login, which is what makes it
 *    usable from an unattended workflow. See `auth/client-credentials.ts`.
 *
 * A Client Credentials token is **not tied to a business user**: several private
 * endpoints (Invitations' `email-invitations` and `invitation-data/delete`) accept an
 * optional `x-business-user-id` header naming an Admin/Manager on the account, "should be
 * provided when access token is obtained using client_credentials grant type" — this
 * app's `client-credentials` auth method carries that id as an optional field and stamps
 * the header whenever it is set.
 *
 * ## No refresh token, and no rate-limit headers
 *
 * The Client Credentials grant answers `{access_token, expires_in}` with **no**
 * `refresh_token` — "When your access token expires, you must issue the same request to
 * get a new token" (grant-type-client-credentials page). `auth/client-credentials.ts`
 * re-mints rather than refreshes.
 *
 * Rate limiting best practices recommends staying under 833 calls/5 minutes or 10K/hour,
 * but documents no response header carrying a remaining count or reset time — so this app
 * declares `quota` unavailable (`health/quota.ts`) rather than guessing at one.
 */

/** Everything except the Invitations API lives here. */
export const API_BASE = "https://api.trustpilot.com";
export const API_PREFIX = "/v1";

/** The Invitations API's own origin — see the module doc above. */
export const INVITATIONS_API_BASE = "https://invitations-api.trustpilot.com";
export const INVITATIONS_API_PREFIX = "/v1/private";

/** `POST` here with HTTP Basic `client_id:client_secret` and `grant_type=client_credentials`. */
export const TOKEN_URL =
  `${API_BASE}${API_PREFIX}/oauth/oauth-business-users-for-applications/accesstoken`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers, merged over the defaults (never used to carry a credential). */
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset. `false` and `0` survive: both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a failed response into one actionable line.
 *
 * Trustpilot's "Common error messages" page documents the *status codes*
 * (400/401/403/404/415/429/496/500/501) and their common causes, but — unlike Apify or
 * Auth0 — publishes no worked example of the error response *body* for any endpoint, and
 * this app could not reach `api.trustpilot.com` live to observe one (every probe from this
 * environment was refused by Trustpilot's own CloudFront WAF before reaching the API,
 * itself a real and documented failure mode worth knowing about — see README). So this
 * reads defensively: it tries a handful of the field names REST APIs commonly use for an
 * error body (`message`, `error`, `error_description`, `errors[]`) and falls back to the
 * status code's documented meaning when the body carries none of them.
 */
export async function formatTrustpilotError(
  res: Response,
  method: string,
  path: string,
): Promise<string> {
  const raw = await res.text().catch(() => "");
  let detail: string | undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const candidate = parsed.message ?? parsed.error_description ?? parsed.error ??
      (Array.isArray(parsed.errors) ? parsed.errors.join("; ") : undefined);
    if (typeof candidate === "string" && candidate) detail = candidate;
    else if (candidate && typeof candidate === "object") detail = JSON.stringify(candidate);
  } catch {
    if (raw) detail = truncate(raw);
  }

  const hint = STATUS_HINTS[res.status];
  const parts = [
    `Trustpilot ${res.status} for ${method} ${path}`,
    detail,
    hint,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/** Documented common causes, from Trustpilot's own "Common error messages" page. */
const STATUS_HINTS: Record<number, string> = {
  400: "check the request for typos or invalid parameters — if searching for a Business " +
    "Unit ID, pass only the base domain, not a page path",
  401: "the request lacked valid authentication, or used the wrong authentication type " +
    "for this endpoint (apikey header vs. OAuth bearer token)",
  403: "often caused by missing admin rights — check the account is on a plan/role that " +
    "allows this call",
  404: "check the URL — this can mean an incorrect base host (must be api.trustpilot.com " +
    "or invitations-api.trustpilot.com) or a resource that does not exist",
  415: "unsupported media type — check the Content-Type header",
  429: "rate limit exceeded — Trustpilot recommends staying under 833 calls/5 minutes or " +
    "10K calls/hour",
  496: "SSL certificate required — an unsupported cipher suite",
  500: "Trustpilot server error — try again in 5-15 minutes",
  501: "not implemented for this account yet",
};

/** Build the query string for a request, dropping unset values. */
function applyQuery(url: URL, query: Record<string, QueryValue> | undefined): void {
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}

/**
 * A single JSON request against either Trustpilot host.
 *
 * Auth is never set here: the runtime signs the request (apikey header or OAuth bearer)
 * between this call and the wire, per the Auth method the invoking Connection uses. This
 * helper only shapes the URL, query, JSON body and `accept`/`content-type` headers.
 */
export async function requestJson<T = unknown>(
  ctx: HookContext,
  base: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${base}${path}`);
  applyQuery(url, options.query);

  const headers: Record<string, string> = { accept: "application/json", ...options.headers };
  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const res = await ctx.fetch(url.toString(), init);
  if (!res.ok) {
    throw new Error(await formatTrustpilotError(res, init.method ?? "GET", url.pathname));
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** `requestJson` against `api.trustpilot.com/v1`. */
export function requestApi<T = unknown>(
  ctx: HookContext,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return requestJson<T>(ctx, API_BASE, `${API_PREFIX}${path}`, options);
}

/** `requestJson` against `invitations-api.trustpilot.com/v1/private`. */
export function requestInvitations<T = unknown>(
  ctx: HookContext,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return requestJson<T>(ctx, INVITATIONS_API_BASE, `${INVITATIONS_API_PREFIX}${path}`, options);
}
