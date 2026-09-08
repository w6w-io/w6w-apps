import type { HookContext } from "@w6w/types";

/**
 * Glide (classic) API client.
 *
 * Everything in this module was verified on 2026-09-06 against Glide's own
 * machine-readable OpenAPI 3.1 document — `www.glideapps.com/docs/openapi.json`,
 * 69,411 bytes, `info.title` "API Reference" — plus the prose docs it links to
 * (`docs/classic-api/general/*`, `docs/classic-api/stashing/*`,
 * `docs/classic-api/tables/data-versioning`) and live probes against
 * `api.glideapps.com` and `status.glideapps.com`. Nothing here came from a
 * third-party integration directory.
 *
 * ## This API only ever sees Big Tables
 *
 * `GET /tables`'s own description: "Get a list of all Big Tables associated
 * with the team of the authenticated user. **No other table types will be
 * included in the response, even though they are part of your Glide team.**"
 * Big Tables are Glide's large-capacity cloud data source — a distinct table
 * type from the spreadsheet-backed tables ("Google Sheets", "Glide Tables" the
 * builder feature, Airtable, etc.) most Glide apps are actually built on. This
 * app cannot read or write those at all: there is no endpoint for them. A
 * workflow author expecting to hit an ordinary Glide app's data source will be
 * looking at an empty table list until they specifically add a Big Table.
 *
 * ## One host, no versioned prefix
 *
 * The document declares exactly one server, `https://api.glideapps.com`, and
 * every path hangs directly off the root (`/tables`, `/jobs/{jobID}`, …) —
 * unlike Apify or Baserow there is no `/v2` or `/api` segment to remember.
 *
 * ## Auth token: team-wide, and "invalid" answers 404, not 401
 *
 * The token comes from the Glide Data Editor, is unique to the Glide *user*
 * but scoped to their *team* (reaches every app and Big Table the team owns),
 * and is sent as `Authorization: Bearer <token>`. Glide's own errors page
 * states plainly: **"Using an auth token that does not exist or is incorrect
 * will result in a `404` response status."** — verified in
 * `docs/classic-api/general/errors`. Never gate a credential check on the
 * status code alone here; `formatGlideError`/`auth/api-token.ts` classify by
 * the response body's `error.type` instead, per the pack-wide rule.
 *
 * ## The envelope is `{"data": …}` — except when it's just `{}`
 *
 * Reads that return content wrap it: `{data: [...]}` (list tables, get rows),
 * `{data: {...}}` (get row, job status, create table, add rows, uploads). A
 * write that only confirms an outcome answers a bare `{}` with a 2xx status —
 * update row, delete row, overwrite table (returns `{data:{jobID}}` instead,
 * see below), stash data, delete stash. `getRows` additionally carries a
 * sibling `continuation` key outside `data`, so it is read with {@link
 * GlideClient.json} rather than unwrapped.
 *
 * ## Every failure is `{"error": {"type", "message"}}`
 *
 * Documented in full on the vendor's errors page, and every `type` seen there
 * is a stable string this app surfaces verbatim: `request_error` (bad/unknown
 * token), `request_validation_error` (malformed stash id/serial or query
 * param), `column_id_not_found` / `column_has_invalid_value` / `column_id_reserved`
 * / `column_id_not_unique` (row data vs. schema mismatch, 422), `row_not_found`
 * (404), `table_not_found` / `table_not_big_table` (a real table id that is not
 * a Big Table), `job_not_found`.
 *
 * ## Rate limits: nothing published
 *
 * `docs/classic-api/general/limits` documents only *payload* limits (15 MB per
 * request; use stashing above that) and per-endpoint *row-count* ceilings
 * (Create/Overwrite Table: 8,000,000 rows; Add Rows: 250,000 rows) — capacity
 * facts, not a metered allowance. A live response from `api.glideapps.com`
 * carries no `RateLimit-*`, `X-RateLimit-*` or `Retry-After` header. See
 * `health/quota.ts` for why that makes quota a declared absence.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.glideapps.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers beyond `accept`/`content-type` (e.g. `if-match`, `x-glide-asynchronous`). */
  headers?: Record<string, string>;
}

interface GlideErrorBody {
  error?: { type?: string; message?: string };
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value (object/array) or the string a
 * user typed, and parse the latter. Absence is an error.
 */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is simply absence rather than an error. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asJson<T>(value, label);
}

/**
 * Stash IDs and serials share one grammar, straight from
 * `docs/classic-api/stashing/introduction#stash-ids-and-serials`: up to 256
 * characters, letters/numbers/hyphens/underscores, must start with a letter or
 * number. Checked client-side because the vendor's own rejection
 * (`request_validation_error`) is otherwise indistinguishable from any other
 * 400.
 */
export const STASH_TOKEN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,255}$/;

export function assertStashToken(value: string, label: string): string {
  const trimmed = (value ?? "").trim();
  if (!STASH_TOKEN_PATTERN.test(trimmed)) {
    throw new Error(
      `${label} "${value}" is invalid: must be 1-256 characters, letters/numbers/hyphens/` +
        "underscores, and start with a letter or number.",
    );
  }
  return trimmed;
}

/**
 * `If-Match` must be the ETag value *verbatim*, quotes included — Glide's spec
 * pattern is `^"[0-9]+"$` (a quoted integer version). A bare number is the most
 * likely paste mistake, so it is called out rather than silently rejected by
 * the vendor as a 400 with no context.
 */
export const IF_MATCH_PATTERN = /^"[0-9]+"$/;

export function assertIfMatch(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!IF_MATCH_PATTERN.test(trimmed)) {
    throw new Error(
      `If-Match "${value}" is invalid: it must be the quoted version string from a previous ` +
        `ETag/Get Rows Version response, e.g. "42" — including the double quotes.`,
    );
  }
  return trimmed;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Glide's `{"error": {"type", "message"}}` body into one actionable line.
 * `type` is kept because it is the stable, documented code the fix differs by —
 * flattening it to a bare status hides, for instance, that a 422 is a column
 * name typo rather than a value type mismatch.
 */
export function formatGlideError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: GlideErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as GlideErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Glide ${status} for ${method} ${path}: ${truncate(raw)}`;

  return truncate(
    `Glide ${status} ${err.type ?? "error"} for ${method} ${path}: ${err.message ?? ""}`.trim(),
    1000,
  );
}

export class GlideClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": …}` in, `data` out. The shape of most reads and writes. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /**
   * Parse the body without unwrapping. Used by Get Rows, whose response
   * carries `continuation` as a sibling of `data` rather than nested inside it.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  /**
   * The raw `Response`, for the one endpoint whose answer lives in a header
   * rather than the body (Get Rows Version's `ETag`) and for writes whose only
   * useful signal is a 2xx status (delete row, delete stash, stash data).
   */
  async send(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatGlideError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
