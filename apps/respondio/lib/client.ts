import type { HookContext } from "@w6w/types";

/**
 * respond.io Developer API v2 client.
 *
 * ## Provenance
 *
 * respond.io's own public docs (`developers.respond.io`) are a Stoplight-hosted
 * single-page app with no reachable machine-readable spec (every
 * `openapi.json`/`openapi.yaml`-shaped path 404s; the page itself renders
 * client-side). Every path, verb, request/response field and error shape in
 * this app was instead verified against respond.io's own **official** GitHub
 * organization (`github.com/respond-io`, `blog: https://respond.io`, operating
 * since 2017):
 *
 *  - **`respond-io/typescript-sdk`** (`@respond-io/typescript-sdk` on npm) — the
 *    published TypeScript client. `src/client.ts` states the base URL and the
 *    bearer auth shape; `src/clients/*.ts` state every path and verb this app
 *    uses; `src/types/*.ts` state every request/response field.
 *  - **`respond-io/mcp-server`** — respond.io's own MCP server, which wraps the
 *    same SDK. `src/constants.ts` supplied the enum vocabularies in
 *    `lib/params.ts`; its `SdkClientManager.performHealthCheck` (`list users,
 *    limit 1`) is the precedent for this app's own credential-liveness probe.
 *  - **Live probes against `api.respond.io`** on 2026-09-05 (see
 *    `auth/api-token.ts` for the auth-specific findings), confirming the base
 *    URL, the error envelope, and a CloudFront-edge quirk documented there.
 *
 * ## One host, one prefix, no envelope
 *
 * `https://api.respond.io/v2` is the only host and prefix; there is no
 * regional variant. Unlike some vendors, **responses are not wrapped** —
 * `GET /v2/contact/{id}` answers the `Contact` object directly, a list
 * endpoint answers `{items, pagination: {next, previous}}`, and most
 * mutations answer `{contactId}` (`ContactActionResponse`).
 *
 * ## Errors
 *
 * Every failure observed live is `{"code": number, "status": string,
 * "message": string}` — e.g. `{"code":401,"status":"AuthorizationError",
 * "message":"Token not found"}`, confirmed 2026-09-05. `code` mirrors the HTTP
 * status in every case seen; `status` is a stable machine label (a caller
 * should classify by the BODY, not just the numeric HTTP status, per the
 * vendor's own `RespondIOError.isRateLimitError()`/`isAuthError()`/etc. helpers
 * in the SDK, which read `statusCode` off the parsed body's `code`).
 *
 * ## Pagination
 *
 * List endpoints take `limit` (1-100, default 10) and `cursorId` and answer
 * an opaque `{next, previous}` cursor pair — there is no `total`, so a
 * workflow paginates by re-invoking with the returned cursor rather than by
 * offset.
 *
 * ## Rate limits
 *
 * The SDK reads `x-ratelimit-limit` / `x-ratelimit-remaining` / `retry-after`
 * response headers defensively (`extractRateLimitInfo`), but neither header
 * was observed on any live response in this app's testing (checked on both a
 * 401 with a Bearer-shaped and a non-Bearer-shaped header) — respond.io may
 * only emit them on an authenticated 2xx, which this app has no live token to
 * confirm. No `quota` health check is declared for that reason; see
 * `README.md`.
 */

/** The one and only API origin, per `HTTPClient`'s default in the official SDK. */
export const API_BASE = "https://api.respond.io";

/** Every documented path in the SDK carries this prefix. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** respond.io's list envelope — every list endpoint in this app answers this shape. */
export interface RespondioListPage<T> {
  items: T[];
  pagination: { next: string; previous: string };
}

/** The error body observed live: `{"code":401,"status":"AuthorizationError","message":"..."}`. */
interface RespondioErrorBody {
  code?: number;
  status?: string;
  message?: string;
}

/**
 * Drop keys the caller left unset — `false` and `0` survive, only
 * nullish/empty-string do not. Generic so the result keeps fitting whichever
 * of `body` (accepts `unknown`) or `query` (expects `Record<string,
 * QueryValue>`) it's passed into, rather than widening every caller to
 * `Record<string, unknown>`.
 */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as T;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Contact-identifier grammar, per the SDK's `ContactIdentifier` type and the
 * official MCP server's own `REGEX_PATTERNS` (`IDENTIFIER_ID`/`_EMAIL`/`_PHONE`).
 * Validated here so a malformed identifier is refused before it ever reaches
 * the wire — the official SDK interpolates it into the path UNENCODED
 * (`` `/contact/${identifier}` ``), which this client mirrors, so refusing
 * anything outside the three documented shapes is the only guard against a
 * caller's stray `/` or `?` reaching the URL.
 */
const IDENTIFIER_PATTERN = /^(id:\d+|email:[^\s@]+@[^\s@]+\.[^\s@]+|phone:\+?\d+)$/;

export function assertIdentifier(identifier: string): string {
  const value = String(identifier ?? "").trim();
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(
      `Invalid contact identifier "${identifier}" — use "id:123", "email:user@example.com", ` +
        `or "phone:+60123456789"`,
    );
  }
  return value;
}

/**
 * Turn respond.io's error body into one actionable line.
 *
 * `status` is kept alongside `code` because it is the stable machine label the
 * vendor's own SDK classifies on (`isRateLimitError`, `isAuthError`, ...);
 * folding it away would leave only a bare HTTP status.
 */
export function formatRespondioError(
  httpStatus: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: RespondioErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as RespondioErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    return `respond.io ${httpStatus} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `respond.io ${httpStatus}${parsed.status ? ` ${parsed.status}` : ""} for ${method} ${path}`,
    parsed.message,
    httpStatus === 429
      ? "respond.io rate-limits per endpoint; retry with backoff (see the retry-after header)"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class RespondioClient {
  constructor(private ctx: HookContext) {}

  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.send<T>("GET", path, { query });
  }

  post<T>(
    path: string,
    body?: unknown,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    return this.send<T>("POST", path, { query, body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>("PUT", path, { body });
  }

  /**
   * respond.io's own SDK sends a JSON body on some DELETE requests
   * (`deleteTags`, `space.deleteTag`) — unusual, but real, so it is supported
   * here rather than dropped.
   */
  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.send<T>("DELETE", path, { body });
  }

  private async send<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = res.status === 204 ? "" : await res.text();
    if (!res.ok) {
      throw new Error(formatRespondioError(res.status, method, url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
