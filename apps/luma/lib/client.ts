import type { HookContext } from "@w6w/types";

/**
 * Luma Public API client.
 *
 * Everything here was verified on 2026-09-01 against Luma's own OpenAPI 3.1
 * document (`public-api.luma.com/openapi.json`, 195,606 bytes, `info.title`
 * "Luma API" `1.0.0`, `info.version` unset), plus live probes against
 * `public-api.luma.com`. Nothing came from a third-party integration
 * directory.
 *
 * ## One host, per-route versioning
 *
 * The OpenAPI document declares exactly one server, `https://public-api.luma.com`.
 * Luma's own "API Conventions" doc explains the `/v{n}/` prefix is **per route**,
 * not a whole-API version: `/v1/webhooks/list` and `/v2/webhooks/create` coexist
 * deliberately, so a path's version is part of the path and is never assumed.
 *
 * ## Auth is calendar-scoped, not account-scoped
 *
 * "API keys are scoped to a single calendar. Each calendar you want to manage
 * via the API needs its own key, and each key only grants access to the
 * calendar it was created on" (docs.luma.com/reference/getting-started-with-your-api,
 * fetched 2026-09-01). There is no `calendarId` param on any endpoint below —
 * the calendar is implied entirely by which key signed the request.
 *
 * ## One envelope shape for every response
 *
 * Luma answers plain JSON objects — no `{data: …}` wrapper, unlike Apify.
 * `GET`/list endpoints that page return `{entries, has_more, next_cursor?}`;
 * a `get`/`create`/`update` endpoint returns the resource (or an empty `{}`
 * for several `update`/`delete`/`cancel` actions, verified against the
 * response schemas — see each action's own doc comment).
 *
 * ## Errors
 *
 * Every failure observed carries `{"message": string, "code": string | null}`
 * with a 4xx/5xx status. Live-probed 2026-09-01:
 *
 *   GET /v1/users/get-self  (no header)      -> 400 {"message":"Please provide an API key.","code":null}
 *   GET /v1/users/get-self  (bogus key)      -> 401 {"message":"You are not signed in.","code":null}
 *
 * `code` was `null` in both cases live, so `message` is the only field this
 * client can rely on for a human-readable reason; `code` is surfaced when
 * present in case a future response fills it in.
 *
 * ## Rate limits
 *
 * "200 requests per minute" per calendar API key, "500 requests per minute"
 * for organization keys (docs.luma.com/reference/rate-limits, fetched
 * 2026-09-01). A `429` is accompanied by `Retry-After`; every authenticated
 * response carries `X-RateLimit-Limit` / `X-RateLimit-Remaining` /
 * `X-RateLimit-Reset`. See `health/quota.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://public-api.luma.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The `{entries, has_more, next_cursor?}` shape every paged list endpoint returns. */
export interface LumaListPage<T> {
  entries: T[];
  has_more: boolean;
  next_cursor?: string;
}

interface LumaErrorBody {
  message?: string;
  code?: string | null;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive — several filters (`is_hidden`, `pagination_limit: 0`)
 * are meaningful at their zero value, and dropping them silently would make
 * that value impossible to express.
 *
 * Generic over the input's own shape (rather than a fixed `Record<string,
 * unknown>`) so a call site's object literal keeps its concrete property
 * types — `query: compact({...})` then satisfies `RequestOptions.query`'s
 * `Record<string, QueryValue>` without a cast at every call site.
 */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as T;
}

/**
 * Normalise a `multiselect` param into a comma-or-repeated list.
 *
 * Luma's array query params (`platforms`, `access`, `tags`) are documented as
 * **repeated** keys ("Pass as repeated query params, e.g. `?platforms=luma&platforms=external`"),
 * not one comma-joined value — the opposite convention from Apify. `send()`
 * below appends one `searchParams` entry per array element for exactly this
 * reason.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Luma's error body into one actionable line.
 *
 * Both fields observed live: `message` is always human prose; `code` was
 * `null` on both the missing-key and bad-key probes, so it is appended only
 * when present rather than relied on to distinguish failure kinds.
 */
export function formatLumaError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: LumaErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LumaErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) return `Luma ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Luma ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.message,
    status === 429
      ? "Luma rate-limits per calendar key (200 requests/minute); honor Retry-After before retrying"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class LumaClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body. Every non-paged endpoint's shape. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `{entries, has_more, next_cursor?}` — every paged list endpoint's shape. */
  list<T = unknown>(path: string, options: RequestOptions = {}): Promise<LumaListPage<T>> {
    return this.json<LumaListPage<T>>(path, options);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Luma's array query params are REPEATED keys, not comma-joined —
      // the opposite of Apify. See `toList` above.
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLumaError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
