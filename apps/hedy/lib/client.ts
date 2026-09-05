import type { HookContext } from "@w6w/types";

/**
 * Hedy API client.
 *
 * Verified 2026-09-05 against Hedy's own OpenAPI 3.0.0 document
 * (`https://api.swaggerhub.com/apis/HedyAI/hedy-api/1.0.1`) plus live probes
 * against `api.hedy.bot`. Nothing here came from a third-party integration
 * directory.
 *
 * ## The host is `api.hedy.bot`, not `api.hedy.ai`
 *
 * The marketing site rebranded `hedy.bot` -> `hedy.ai` (the old domain
 * redirects), but the API host did not follow: `api.hedy.ai` is NXDOMAIN,
 * and the OpenAPI document's one declared server is
 * `https://api.hedy.bot/`. This app only ever calls the `.bot` host.
 *
 * ## One envelope, and it tells you plainly whether you got it
 *
 * Every response — success or failure — is a JSON object carrying a boolean
 * `success` field:
 *
 *  - `{"success": true, "data": …}` for a single resource, with an added
 *    `"pagination": {hasMore, next, total}` on the two list endpoints.
 *  - `{"success": false, "error": {"code", "message"}}` on failure, at
 *    whatever HTTP status the failure carries (401 for a bad/missing key,
 *    404 for an unknown resource id, 429 for rate limiting).
 *
 * `code` is a stable machine string (`missing_api_key`, `invalid_api_key`,
 * `invalid_request`, …) and is kept verbatim in {@link formatHedyError}
 * rather than collapsed to a bare status, because "no key reached the
 * request" and "the key is wrong" are different problems with different
 * fixes.
 *
 * ## Live behaviour differs from an earlier note about this API
 *
 * An unauthenticated `GET /sessions` or `GET /highlights` answers **401**
 * with the structured error body above (`missing_api_key`), verified live on
 * 2026-09-05 — not 404. A syntactically-invalid key answers 401 too
 * (`invalid_api_key`, "Invalid API key format"). **404** is reserved for a
 * genuinely unknown route (`GET /v1/sessions`, `GET /foo-bar-baz` both answer
 * a plain Express `Cannot GET …` HTML page, no JSON at all) — so a 404 here
 * really does mean "wrong path", and the auth probe below never needs to
 * treat it as an auth outcome. This app's auth classification is written
 * against the behaviour actually observed, not against that earlier note.
 *
 * ## Rate limiting
 *
 * Every response — authenticated or not — carries `x-ratelimit-limit`,
 * `x-ratelimit-remaining` and `x-ratelimit-reset` (a Unix timestamp in
 * seconds). Measured live: the window is short (limit 200, reset ~60s out),
 * not the "per hour" a bare reading of the header name might suggest.
 * `health/quota.ts` reads these off the same signed call the auth probe
 * already makes.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.hedy.bot";

export type QueryValue = string | number | boolean | undefined | null;

export interface HedyPagination {
  hasMore?: boolean;
  next?: string;
  total?: number;
}

export interface HedyErrorBody {
  success?: boolean;
  error?: { code?: string; message?: string };
}

export interface HedyEnvelope<T> {
  success?: boolean;
  data?: T;
  pagination?: HedyPagination;
}

/** Rate-limit headers present on every response, success or failure. */
export interface HedyRateLimit {
  limit?: number;
  remaining?: number;
  /** Unix timestamp, seconds. */
  resetAt?: number;
}

export function readRateLimit(res: Response): HedyRateLimit {
  const num = (name: string): number | undefined => {
    const raw = res.headers.get(name);
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    resetAt: num("x-ratelimit-reset"),
  };
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Hedy's error body into one actionable line.
 *
 * `code` is kept because it is the thing that tells apart "no key reached
 * the request" (`missing_api_key`), "the key is malformed or wrong"
 * (`invalid_api_key`) and "the resource does not exist" (`not_found` on a
 * 404) — collapsing all three to a bare HTTP status hides which one you hit.
 */
export function formatHedyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: HedyErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HedyErrorBody;
  } catch { /* not JSON (e.g. the plain-HTML 404 for an unknown route) */ }

  const err = parsed?.error;
  if (!err) return `Hedy ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Hedy ${status} ${err.code ?? "error"} for ${method} ${path}`,
    err.message,
    status === 429 ? "Hedy is rate-limiting; retry after x-ratelimit-reset" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class HedyClient {
  constructor(private ctx: HookContext) {}

  /**
   * `GET` a documented endpoint. Unwraps the `{success, data, pagination}`
   * envelope and throws {@link formatHedyError} on any non-`success` answer
   * — including a 200 whose body somehow carries `success: false`, which the
   * documented shape never rules out.
   */
  async get<T = unknown>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<{ data: T; pagination?: HedyPagination; response: Response }> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await this.ctx.fetch(url.toString(), {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let body: HedyEnvelope<T> | null = null;
    try {
      body = text ? (JSON.parse(text) as HedyEnvelope<T>) : null;
    } catch { /* the plain-HTML unknown-route page, or an empty body */ }

    if (!res.ok || !body?.success) {
      throw new Error(formatHedyError(res.status, "GET", url.pathname, text));
    }
    return { data: body.data as T, pagination: body.pagination, response: res };
  }
}
