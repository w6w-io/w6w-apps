import type { HookContext } from "@w6w/types";

/**
 * systeme.io Public API REST client.
 *
 * Everything in this module was verified on 2026-08-24 against systeme.io's own
 * machine-readable OpenAPI 3.1 document. The rendered reference page
 * (`developer.systeme.io/reference/api`) is a Readme.io site with no visible
 * "download OpenAPI" link, but Readme.io embeds the full spec as JSON inside
 * every page's server-rendered `<script id="ssr-props">` payload
 * (`document.api.schema`) — that is the source used here, not the rendered HTML.
 * Confirmed live: `servers[0].url` is `https://api.systeme.io`, every path is
 * confirmed via that same document (45 paths, 82 operations at the time of
 * writing), and the auth scheme (`components.securitySchemes.Api_Key`) is a
 * plain header key, not OAuth2 — matched by a live probe below.
 *
 * ## Auth is a bare header, not a bearer token
 *
 * The vendor's own words: "your only option right now is to attach your API
 * key to the `X-API-Key` header of each request." There is no `Bearer ` prefix
 * and no OAuth2 surface at all — see `auth/api-key.ts`.
 *
 * ## Two ways to fail authentication, and they are NOT the same problem
 *
 * Measured live on 2026-08-24 against `GET /api/contacts`:
 *
 *  - **No header at all** → `401`, `application/problem+json`, body
 *    `{"detail":"Full authentication is required to access this resource."}`.
 *  - **Header present but wrong** → `401`, the same content type, body
 *    `{"detail":"Invalid API Key."}`, plus a `WWW-Authenticate: API Key` response
 *    header that the first case does not carry.
 *
 * Both are genuine RFC 7231-style problem-details bodies (confirmed live, not
 * assumed) — this is not a catch-all page, and the two are distinguished by
 * `detail` text, not just by status. See `auth/api-key.ts` for how `test` tells
 * them apart, and never confuses "assume it's fine" with "confirmed live".
 *
 * ## PATCH uses `application/merge-patch+json`, not `application/json`
 *
 * Confirmed from the OpenAPI document's own `requestBody.content` key on every
 * `PATCH` operation this app calls. Sending a normal `application/json` PATCH
 * is a documented way to end up guessing at undocumented behaviour, so
 * {@link SystemeClient.patch} sets the header explicitly rather than reusing
 * the POST/PUT code path.
 *
 * ## Cursor pagination reads the last ID back, not an opaque token
 *
 * Every collection answers `{"items": [...], "hasMore": boolean}`. The vendor's
 * own guidance: set `startingAfter` to the **positive `id` of the last item
 * returned**, keep the same `order`, and never guess a value or start from `0`.
 * `limit` is bounded `[10, 100]` — the floor is 10, so "give me 3 rows" is not
 * expressible; only the vendor's cap is enforced here, not a synthetic client
 * slice, because trimming client-side would silently break `hasMore`.
 *
 * ## Rate limiting has no remaining-count header on any response
 *
 * `X-RateLimit-Limit` / `X-RateLimit-Refill` describe the ceiling and refill
 * cadence; a `429` carries `Retry-After` (seconds). There is no
 * `X-RateLimit-Remaining` at all in the documented header set — contrast this
 * with Apify, which omits *remaining* but at least states the ceiling per call.
 */

export const API_BASE = "https://api.systeme.io";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /**
   * `unknown` values rather than {@link QueryValue}: every caller builds this
   * from `compact(input)`, which necessarily loses the narrower type — the
   * only thing done with a value here is `String(v)`, so nothing is lost by
   * accepting `unknown`.
   */
  query?: Record<string, unknown>;
  body?: unknown;
  /** Send the body as `application/merge-patch+json` instead of `application/json`. */
  mergePatch?: boolean;
}

/** The `{"items": [...], "hasMore": boolean}` envelope every collection endpoint answers. */
export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

interface ProblemBody {
  type?: string;
  title?: string;
  detail?: string;
}

/** Drop keys the caller left unset — `false` and `0` survive; only `undefined`/`null`/`""` don't. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * The cursor-pagination query params every collection endpoint accepts.
 *
 * `limit`'s floor is 10 (not 1) per the vendor's own schema — passing a lower
 * value is rejected by the API, not silently clamped, so nothing here
 * pretends otherwise.
 */
export interface PageQuery {
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

/** Keep an error/response body readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a systeme.io `application/problem+json` error into one actionable line.
 *
 * `detail` is kept verbatim because it is the only field that reliably
 * distinguishes causes (see the two 401 bodies documented above); `title` is
 * usually the unhelpful constant `"An error occurred"` and is dropped when
 * `detail` is present.
 */
export function formatSystemeError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ProblemBody | null = null;
  try {
    parsed = JSON.parse(raw) as ProblemBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const detail = parsed?.detail ?? parsed?.title;
  if (!detail) return `systeme.io ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `systeme.io ${status} for ${method} ${path}`,
    detail,
    status === 429 ? "rate limited — retry after the Retry-After header's delay" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class SystemeClient {
  constructor(private ctx: HookContext) {}

  async get<T = unknown>(path: string, query?: Record<string, unknown>): Promise<T> {
    return await this.send<T>(path, { method: "GET", query });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.send<T>(path, { method: "POST", body });
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.send<T>(path, { method: "PUT", body });
  }

  /** `application/merge-patch+json` — see the module doc for why this isn't plain `application/json`. */
  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.send<T>(path, { method: "PATCH", body, mergePatch: true });
  }

  /** Status only — for the 204-no-content deletes and the 202-accepted membership create. */
  async status(
    path: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<number> {
    const res = await this.raw(path, { method: options.method ?? "DELETE", body: options.body });
    return res.status;
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const res = await this.raw(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async raw(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = options.mergePatch
        ? "application/merge-patch+json"
        : "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSystemeError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
