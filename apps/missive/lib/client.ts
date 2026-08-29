import type { HookContext } from "@w6w/types";

/**
 * Missive REST API v1 client.
 *
 * Verified 2026-08-29 against Missive's own GitBook-hosted API reference:
 *
 *  - `missiveapp.com/docs/developers/rest-api` — base URL, auth header shape,
 *    response/error format.
 *  - `missiveapp.com/docs/developers/rest-api/endpoints` — every path, verb,
 *    request body and response shape used by this app (184 KB, "Last updated
 *    on September 18th, 2025").
 *  - `missiveapp.com/docs/developers/rest-api/rate-limits` — the concurrency
 *    and per-minute/per-15-minute ceilings, and which headers accompany a 429.
 *
 * Live-probed the same day: `POST /v1/drafts` with no token and with a
 * syntactically plausible fake token both answer
 * `401 {"error":{"message":"Authentication token is invalid or has been
 * revoked"}}` — the same message either way, so `auth/api-token.ts` cannot
 * distinguish "missing" from "wrong" and does not try to.
 *
 * ## One host, one prefix, one envelope shape... mostly
 *
 * Every endpoint lives at `https://public.missiveapp.com/v1/...`. Most
 * responses wrap the resource under its own plural key
 * (`{"conversations": [...]}`, `{"contacts": [...]}`), and the same key is
 * reused for singular reads — but the vendor's own examples show that key
 * holding **either** an array or a bare object depending on the endpoint:
 * `GET /v1/conversations/:id` documents an array (`"conversations": [{...}]`,
 * because a conversation can resolve to a different id after a merge), while
 * `GET /v1/messages/:id` and `GET /v1/tasks/:id` document a bare object. This
 * client does not paper over that with a guess — {@link unwrapSingle} accepts
 * either shape defensively (array → first element, object → itself), and each
 * "get one" action documents which shape Missive's own reference shows for
 * that endpoint.
 *
 * ## Errors
 *
 * Every failure is `{"error":{"message": "..."}}` with a 4xx/5xx status,
 * confirmed live. {@link formatMissiveError} surfaces the vendor's own message
 * verbatim rather than flattening to "HTTP 401".
 *
 * ## Rate limits
 *
 * 5 concurrent requests, 300/minute, 900/15 minutes. A `429` carries
 * `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` and
 * `X-RateLimit-Reset` — but the docs describe those headers only as
 * accompanying the refusal itself, never as available in advance on a normal
 * response. See `health/quota.ts` for why that rules out a headroom check.
 */

export const API_BASE = "https://public.missiveapp.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface MissiveErrorBody {
  error?: { message?: string };
}

/** Drop keys the caller left unset, so an optional filter never sends `undefined`/`""`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Accept an id-list param as either a real array or a comma-separated string
 * (the shape a form field or a previous step's plain-text output hands back),
 * and join it the way Missive's batch paths expect: `:id1,:id2,:id3`.
 */
export function toIdList(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  const items = Array.isArray(value) ? value : String(value).split(",");
  return items.map((s) => String(s).trim()).filter(Boolean);
}

/** Join an id-list param into the comma-separated path segment Missive expects. */
export function joinIds(value: unknown): string {
  const ids = toIdList(value);
  if (ids.length === 0) throw new Error("at least one id is required");
  return ids.map(encodeURIComponent).join(",");
}

/**
 * Parse a `json`-typed param that may already have been parsed by the host, or
 * may still be the raw string a user typed into a form field.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Unwrap a "get one" response that may be an array (Missive's own documented
 * shape for `GET /v1/conversations/:id`) or a bare object (every other single
 * -resource `GET` this app calls). See the module doc for why both are
 * handled rather than assumed.
 */
export function unwrapSingle<T>(value: T | T[] | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Keep an error message readable without truncating the actionable part. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Missive's `{"error":{"message"}}` body into one actionable line.
 *
 * On a 429 the vendor also sends `Retry-After` — surfaced here because the
 * bare message ("Too Many Requests") does not say how long to wait.
 */
export function formatMissiveError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  let parsed: MissiveErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as MissiveErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.error?.message;
  const parts = [
    `Missive ${status} for ${method} ${path}`,
    message ?? truncate(raw),
    status === 429 && retryAfter ? `retry after ${retryAfter}s` : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class MissiveClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON body. Returns `undefined` for a 204/empty body (deletes). */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — used by the two `DELETE` actions, which return no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // The vendor's own note: "You must explicitly send POST requests with
      // Content-Type: application/json."
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatMissiveError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("retry-after"),
        ),
      );
    }
    return res;
  }
}
