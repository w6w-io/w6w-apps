import type { HookContext } from "@w6w/types";

/**
 * Lokalise REST API v2 client (`api.lokalise.com/api2`).
 *
 * Everything in this module was verified on 2026-09-01 against Lokalise's own
 * machine-readable OpenAPI 3.0.3 document
 * (`developers.lokalise.com/openapi/lokalise-api-without-branches.yml` — served
 * as JSON despite the `.yml` extension, 270,538 bytes), plus live probes against
 * `api.lokalise.com`. Nothing here came from a third-party integration
 * directory.
 *
 * ## One host, one prefix
 *
 * The document declares exactly one server, `https://api.lokalise.com/api2`.
 * There is a separate `-with-branches` variant of the same document for
 * projects with Git-style branching enabled, but it describes the identical
 * host and the identical non-branch paths this app uses — branching itself is
 * out of scope (see the app's README).
 *
 * ## Create endpoints are bulk-only
 *
 * Keys, languages, contributors and comments have **no single-item create**.
 * `POST /projects/{id}/keys` always takes `{"keys": [...]}`, even for one key —
 * there is no `POST .../keys/single` shortcut. Getting this wrong is the
 * single most common way a first attempt at this API breaks: sending a bare
 * key object fails validation, not with "did you mean to wrap this in an
 * array" but with a generic 400.
 *
 * ## A 200 does not mean every item in a bulk request succeeded
 *
 * A bulk create answers `200` with `{..., "keys": [...succeeded], "errors":
 * [...failed]}` — the two arrays sit side by side in one response, one HTTP
 * status. Lokalise's own docs give the example of creating two keys where one
 * name is already taken: the response is still `200`, `keys` has one entry,
 * and `errors` has one `{message, code, key_name}`. {@link LokaliseClient.bulk}
 * surfaces both arrays rather than treating a 200 as unconditional success.
 *
 * ## The error envelope
 *
 * A plain failure is `{"error": {"message", "code"}}` with an HTTP status that
 * usually matches `code` — but not always (see `auth/api-token.ts` for the
 * documented-vs-observed gap on missing/malformed tokens). `code` is a stable
 * enough signal to build UI copy on: 400 (bad request / validation), 401
 * (unauthorized), 403 (forbidden), 404 (not found), 406 (malformed resource),
 * 429 (rate limited).
 *
 * ## Rate limits
 *
 * Documented: 6 requests/second per API token *and* per IP, plus a 10
 * concurrent-request ceiling per project. Observed live 2026-09-01: every
 * response (even a 401) carries `x-ratelimit-limit`, `x-ratelimit-remaining`
 * and `x-ratelimit-reset` — a genuine, currently-usable remaining count, unlike
 * many vendors that publish only a ceiling. See `health/request-rate.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.lokalise.com/api2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface LokaliseErrorBody {
  error?: { message?: string; code?: number };
}

/** Rate-limit headroom read off any response, when the vendor sends it. */
export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  /** Seconds until the window resets, per the vendor's own header semantics. */
  resetSeconds?: number;
}

/** Drop keys the caller left unset. `false` and `0` survive — both meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/**
 * Accept a value that is legitimately EITHER a plain string OR a JSON object
 * — Lokalise's `translation` field, which is plain text for a singular key
 * but `{"one": "...", "other": "..."}` for a plural one.
 *
 * Unlike {@link asOptionalJson}, a string that fails to parse as JSON is not
 * an error here — it is returned verbatim, because "Hello world" is a
 * perfectly valid translation and is not JSON. Only a string that *looks*
 * like a JSON object or array (starts with `{` or `[`) is parsed; anything
 * else is passed through untouched.
 */
export function asTextOrJson(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not actually JSON despite the leading brace — fall through as text.
    }
  }
  return value;
}

/** Normalise a `multiselect`/comma-string param into a string array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Render a boolean the way Lokalise's `1`/`0`-style query flags expect. */
export function boolFlag(v: boolean | undefined): number | undefined {
  return v === undefined ? undefined : (v ? 1 : 0);
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied resource id (project id, key id, ...). */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Read the rate-limit headers Lokalise sends on every response.
 *
 * Exported so `health/request-rate.ts` and the tests exercise the exact same
 * parsing the client itself could use — kept separate from client instance
 * state because a health check reads it off a response it made for its own
 * reasons.
 */
export function readRateLimit(res: Response): RateLimitReading {
  const limit = res.headers.get("x-ratelimit-limit");
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  // Lokalise documents `x-ratelimit-limit` as a comma-separated list of
  // window descriptions (observed live: "10, 10;w=1, 10;w=1"); the first
  // number is the effective ceiling for the shortest window.
  const firstNumber = (raw: string | null): number | undefined => {
    if (!raw) return undefined;
    const m = raw.match(/-?\d+/);
    return m ? Number(m[0]) : undefined;
  };
  return {
    limit: firstNumber(limit),
    remaining: firstNumber(remaining),
    resetSeconds: firstNumber(reset),
  };
}

/**
 * Turn Lokalise's error body into one actionable line.
 *
 * The numeric `code` is kept alongside the HTTP status because they can
 * legitimately differ within the same error object (a 400 body can carry
 * `code: 404` for a nested lookup failure), and because it is the value the
 * vendor's own docs are written against.
 */
export function formatLokaliseError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: LokaliseErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LokaliseErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Lokalise ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Lokalise ${status}${
      err.code !== undefined && err.code !== status ? ` (code ${err.code})` : ""
    } for ${method} ${path}`,
    err.message,
    status === 429
      ? "Lokalise rate-limits at 6 requests/second per token and per IP; retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class LokaliseClient {
  constructor(private ctx: HookContext) {}

  /** Parse the body as JSON. Used by every endpoint in this app — none of them
   * answer a bare array or a non-JSON body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A list endpoint: the body is `{[arrayKey]: T[], ...}`, not a bare array,
   * and paging metadata rides in headers rather than the body.
   *
   * `X-Total-Count` is present under **offset** pagination (the default) and
   * absent under **cursor** pagination, which Lokalise documents as
   * deliberately not counting the total for performance. `nextCursor` is
   * populated only when more pages remain, matching the vendor's own
   * "continue until no `nextCursor` is returned" instruction — so its absence
   * is the loop-termination signal, not a failure.
   */
  async list<T = unknown>(
    path: string,
    arrayKey: string,
    options: RequestOptions = {},
  ): Promise<
    { items: T[]; totalCount?: number; nextCursor?: string; raw: Record<string, unknown> }
  > {
    const res = await this.send(path, options);
    const text = await res.text();
    const body = (text ? JSON.parse(text) : {}) as Record<string, unknown>;
    const items = (body[arrayKey] as T[] | undefined) ?? [];
    const totalHeader = res.headers.get("x-total-count");
    const cursorHeader = res.headers.get("x-pagination-next-cursor");
    return {
      items,
      totalCount: totalHeader ? Number(totalHeader) : undefined,
      nextCursor: cursorHeader || undefined,
      raw: body,
    };
  }

  /** Status only, for endpoints that answer with no meaningful body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
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
      throw new Error(
        formatLokaliseError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
