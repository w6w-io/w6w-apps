import type { HookContext } from "@w6w/types";

/**
 * Readwise API v2 client (`readwise.io/api/v2/...`).
 *
 * Everything in this module was verified on 2026-08-29 against Readwise's own
 * published reference at `readwise.io/api_deets` (confirmed 200 OK, 159,497
 * bytes) plus live, unauthenticated probes against `readwise.io`. Nothing came
 * from a third-party integration directory.
 *
 * ## One host, no separate API subdomain
 *
 * Every documented path lives under `https://readwise.io/api/v2/...` — there is
 * no `api.readwise.io`. That single host is the app's entire `network.allow`.
 *
 * ## Not the Reader API
 *
 * Readwise publishes a **second**, unrelated product API for Reader
 * (`readwise.io/api/v3/...`, its own doc page linked from `/api_deets` as
 * "Looking for the API docs for Reader? See here."). This app covers only the
 * classic Highlights/Books surface documented at `/api_deets`; nothing from the
 * Reader v3 surface is used here, and the two are not interchangeable — they
 * have different auth scopes and different resource models.
 *
 * ## Two response shapes
 *
 * Most list endpoints answer Django REST Framework's offset-page envelope,
 * `{count, next, previous, results}`. The one exception is `GET /export/`,
 * which pages by an opaque cursor instead: `{count, nextPageCursor, results}`.
 * Both are typed separately below rather than forced into one shape, since
 * `nextPageCursor` is not a URL the way `next` is.
 *
 * ## Errors
 *
 * A missing/invalid token answers `401` with `{"detail": "..."}` — e.g.
 * `{"detail": "Authentication credentials were not provided."}` or
 * `{"detail": "Invalid token."}` (both measured live on 2026-08-29). A
 * validation failure answers `400` with Django REST Framework's per-field
 * shape, `{"field": ["message", ...]}`. {@link formatReadwiseError} renders
 * either.
 *
 * ## Rate limits
 *
 * 240 requests/minute per access token by default; the Highlight LIST and Book
 * LIST endpoints are restricted to 20/minute. A `429` carries a `Retry-After`
 * header naming the number of seconds to wait — there is no proactive quota
 * header on a normal response (measured: no `X-RateLimit-*` header on either a
 * 401 or a 204 from `/api/v2/auth/`), which is why this app declares no `quota`
 * health check rather than guessing at one.
 */

/** The one and only API origin. Readwise documents no other host for this surface. */
export const API_BASE = "https://readwise.io";
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

/** Django REST Framework's standard offset-page envelope. */
export interface ReadwisePage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** `GET /export/`'s own envelope — cursor paging, not offset paging. */
export interface ReadwiseExportPage<T> {
  count: number;
  nextPageCursor: string | null;
  results: T[];
}

interface DetailErrorBody {
  detail?: string;
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Readwise's error body into one actionable line.
 *
 * `{"detail": "..."}` (auth failures) is rendered directly. A DRF field-error
 * body (`{"text": ["This field is required."]}`) is flattened to
 * `field: message` pairs, because a raw dump of the object reads worse than
 * the fields it names. Anything else falls back to the raw text.
 */
export function formatReadwiseError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }

  const parts = [`Readwise ${status} for ${method} ${path}`];

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as DetailErrorBody & Record<string, unknown>;
    if (typeof obj.detail === "string") {
      parts.push(obj.detail);
    } else {
      const fields = Object.entries(obj)
        .map(([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join("; ") : String(value)}`
        );
      if (fields.length > 0) parts.push(fields.join(" · "));
      else parts.push(truncate(raw));
    }
  } else if (raw) {
    parts.push(truncate(raw));
  }

  if (status === 429) {
    parts.push(
      retryAfter
        ? `retry after ${retryAfter}s (Retry-After header)`
        : "rate-limited; check the Retry-After header and back off",
    );
  }

  return truncate(parts.join(": "), 1000);
}

export class ReadwiseClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — used by DELETE, which answers 204 with no body. */
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

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatReadwiseError(
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

/** Drop keys the caller left unset, without dropping meaningful `false`/`0`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}
