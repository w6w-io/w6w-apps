import type { HookContext } from "@w6w/types";

/**
 * Heartbeat API v0 REST client (`api.heartbeat.chat`).
 *
 * Every path, verb, query parameter, body field and response schema in this
 * app was read off Heartbeat's own OpenAPI 3.0 document — embedded verbatim
 * as `oasDefinition` inside the `__NEXT_DATA__` payload of every page under
 * `https://heartbeat.readme.io/reference/*` (fetched 2026-09-05,
 * `info.version` `1.0.0`) — plus live probes against `api.heartbeat.chat` and
 * `status.heartbeat.chat` the same day. ReadMe does not publish the document
 * at a stable `/openapi.json`-shaped URL; it only ships inline with the
 * rendered reference, so that is where this was pulled from.
 *
 * ## Three findings that shaped this app
 *
 *  1. **No envelope, unlike most REST APIs this pack wraps.** A Heartbeat list
 *     endpoint answers a bare JSON array, and a get-by-id answers the resource
 *     object directly — there is no `{"data": …}` wrapper to unwrap. Only two
 *     endpoints break that pattern on purpose: `getChatChannelMessages`
 *     answers `{data, hasMore}` (cursor pagination) and `getDocuments` takes
 *     the same `startingAfter`/`limit` cursor params but answers a **bare
 *     array with no `hasMore` at all** — so paging that list has no signal
 *     for "was that the last page?" beyond "did I get fewer than `limit`
 *     back?" (which breaks the moment the count divides evenly). This app's
 *     `list-documents` output says so rather than let it surprise a workflow
 *     mid-page.
 *  2. **Errors are one flat shape, verified live.** Both a missing and an
 *     invalid API key answer `401 {"error":true,"message":"Invalid API Key"}`
 *     — measured directly against `api.heartbeat.chat/v0/users` with no
 *     `Authorization` header and with a syntactically-plausible bogus one.
 *     There is no machine-stable error *code*, only the human `message`, so
 *     {@link formatHeartbeatError} surfaces it verbatim rather than pretending
 *     to classify it further than the vendor does.
 *  3. **The rate-limit window is two seconds, not one.** Every response,
 *     including a 401, carries `x-ratelimit-limit` / `x-ratelimit-remaining` /
 *     `x-ratelimit-reset` (measured live: `limit: 20`, `reset` ~2 seconds
 *     ahead of the request). The vendor's prose says "10 requests per
 *     second"; a limit of 20 over a rolling ~2-second window is exactly that
 *     average, but a caller reading `x-ratelimit-limit` as a per-second
 *     ceiling would overestimate its burst budget by 2x. See `health/quota.ts`.
 *
 * ## Rich text is a restricted HTML subset, not Markdown
 *
 * Every `text` field this API accepts (thread/comment/chat/direct-message
 * bodies) is documented plainly: only `<p>`, `<a>`, `<b>`, `<h1>`-`<h3>`,
 * `<ul>`, `<li>`, `<br>` survive, every other tag is stripped, and only
 * `<a>`'s `href` attribute survives. `@`-mentions are inline HTML text nodes
 * of the literal form `@<uuid>` (a user or group id) — passing anything else
 * does not error, it just fails to render as a mention. This app's params say
 * so rather than let a caller paste Markdown and get silently-stripped output.
 */

/** The one and only API origin. The OpenAPI document declares exactly one server. */
export const API_BASE = "https://api.heartbeat.chat";
export const API_PREFIX = "/v0";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface HeartbeatErrorBody {
  error?: boolean;
  message?: string;
}

/** Drop keys the caller left unset, so an optional field is never sent as `null`/`""`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/repeated-string param into a plain string array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can, in principle, be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Heartbeat's error body into one actionable line.
 *
 * There is no machine-stable error code in this API — every documented
 * failure (`ValidationError`, `UnauthorizedError`, a bare 404) is described in
 * prose only, and the live 401 body is `{"error":true,"message":"…"}` with
 * nothing else. So this reports the vendor's own `message` verbatim rather
 * than inventing a taxonomy the vendor itself does not have.
 */
export function formatHeartbeatError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: HeartbeatErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HeartbeatErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.message;
  const suffix = status === 429
    ? " — Heartbeat allows at most 10 requests/second per API key; back off and retry"
    : "";
  if (message) return `Heartbeat ${status} for ${method} ${path}: ${message}${suffix}`;
  return `Heartbeat ${status} for ${method} ${path}: ${truncate(raw)}${suffix}`;
}

/** The rate-limit headers Heartbeat stamps on every response — see finding 3 above. */
export interface RateLimitHeaders {
  limit?: number;
  remaining?: number;
  /** Unix seconds. */
  reset?: number;
}

export function readRateLimitHeaders(headers: Headers): RateLimitHeaders {
  const num = (name: string) => {
    const v = headers.get(name);
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    reset: num("x-ratelimit-reset"),
  };
}

export class HeartbeatClient {
  constructor(private ctx: HookContext) {}

  /** Bare JSON response — no envelope. Used by nearly every endpoint. See finding 1. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer 204/empty-body (none currently do, kept for parity). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  /** Same request `json` makes, but hands back the response too — for reading rate-limit headers. */
  async jsonWithHeaders<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ body: T; headers: Headers }> {
    const res = await this.send(path, options);
    const text = res.status === 204 ? "" : await res.text();
    return { body: (text ? JSON.parse(text) : undefined) as T, headers: res.headers };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
      throw new Error(formatHeartbeatError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
