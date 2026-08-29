import type { HookContext } from "@w6w/types";

/**
 * Typefully Public API v2 REST client.
 *
 * Everything here was verified on 2026-08-29 against Typefully's own
 * machine-readable OpenAPI 3.1 document — served embedded in the React payload
 * of `https://typefully.com/docs/api` (`info.version` `2.0.0`, `info.title`
 * `Typefully Public API`), extracted verbatim from the page's own
 * `self.__next_f.push` chunks rather than a third-party integration directory.
 *
 * ## One host, one prefix, one auth scheme
 *
 * The document declares exactly one server, `https://api.typefully.com`, and
 * every documented path carries the `/v2` prefix. Authentication is a single
 * `PublicAPIAuthentication` HTTP-bearer scheme — `Authorization: Bearer
 * <api-key>` — generated from Typefully's own Settings page. There is no query
 * parameter form and no OAuth surface for third-party apps.
 *
 * ## Uniform envelope, uniform error
 *
 * Every success response is a JSON object; there is no bare-array or
 * non-JSON-content-type endpoint anywhere in this surface (unlike, say,
 * Apify's dataset-items or key-value-record reads). List endpoints share one
 * paginated envelope — `{results, count, limit, offset, next, previous}` —
 * with `limit`/`offset` query parameters (defaults and maxima vary by
 * endpoint; each list action states its own). Every error is
 * `{"error": {"code", "message", "details"?}}` with a matching 4xx/5xx status;
 * `code` is a stable machine string (`UNAUTHORIZED`, `VALIDATION_ERROR`,
 * `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `MONETIZATION_ERROR`,
 * `INSUFFICIENT_ACCESS_LEVEL`, `CONFLICT`, `SERVICE_UNAVAILABLE`, plus the
 * three comment-marker codes `COMMENTS_MARKER_MISMATCH`,
 * `COMMENTS_MARKER_UNKNOWN_ID`, `COMMENTS_MARKER_MALFORMED`) and is surfaced
 * verbatim by {@link formatTypefullyError} — a flattened "HTTP 409" hides which
 * one you hit, and the fix differs per code.
 *
 * Every documented `DELETE` in this surface answers `204 No Content`.
 *
 * ## Rate limits, on two axes
 *
 * Typefully rate-limits per user AND per social set, and both are reported on
 * every response: `X-RateLimit-User-Limit` / `-Remaining` / `-Reset` (all
 * endpoints, per user) and `X-RateLimit-SocialSet-Limit` / `-Remaining` /
 * `-Reset` / `-Resource` (specific operations — e.g. draft creation — per
 * social set, keyed by a resource id like `"drafts.create"`). A `429` answers
 * `RATE_LIMITED`. See `health/quota.ts` for how the two are read.
 *
 * ## Media upload is two calls, and this app can only make one of them
 *
 * `POST /media/upload` returns `{media_id, upload_url}` — a presigned S3 URL
 * good for one hour. The file bytes must then go there directly: a plain
 * `PUT` of the raw bytes with **no extra headers** (the signature was computed
 * without them; adding `Content-Type` or `Authorization` fails with `403
 * SignatureDoesNotMatch`). That second call is deliberately **not** an Action
 * here: the presigned host is generated per-call and is not `api.typefully.com`
 * (Typefully's own example shows `s3.amazonaws.com`, but the bucket/region is
 * not documented as fixed), and this app's sandbox egress allowlist
 * (`w6w.network.allow`) is static and declared in advance. LinkedIn's own app
 * in this pack declines the equivalent LinkedIn Images upload for the identical
 * reason. `actions/media-upload-create.ts` returns the URL so a workflow can
 * hand it to an HTTP step (or `@w6w/http`) that performs the PUT itself;
 * `actions/media-status-get.ts` polls the result.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.typefully.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  /**
   * `Record<string, unknown>` rather than `Record<string, QueryValue>` so an
   * action can hand it the result of {@link compact} — a `Partial<T>` of
   * whatever shape it built — without a cast at every call site. `send()`
   * still only ever renders the `QueryValue` shapes at runtime: a scalar via
   * `String(v)`, an array as repeated keys, anything nullish/empty dropped.
   */
  query?: Record<string, unknown>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Typefully's `{results, count, limit, offset, next, previous}` list envelope. */
export interface TypefullyListPage<T> {
  results: T[];
  count: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

interface TypefullyErrorDetail {
  message?: string;
  field?: string | null;
  type?: string | null;
}

interface TypefullyErrorBody {
  error?: { code?: string; message?: string; details?: TypefullyErrorDetail[] | null };
}

/**
 * Drop keys the caller left unset, so an optional query parameter is only sent
 * when the caller actually gave it a value. `false` and `0` survive: Typefully
 * has no boolean query parameter that defaults away from `false`, but a
 * `0` `offset` is meaningful and must not be dropped.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host hands a `json`-typed param through in whichever shape it arrived,
 * so this is applied once here rather than at each call site.
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

/** Same, but absence is not an error — used for optional `json` params. */
export function asOptionalJson<T>(value: unknown): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  return JSON.parse(value) as T;
}

/** Normalise a `multiselect`/repeated `string` param into a plain string array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can carry many field errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Typefully's `{"error": {"code","message","details"}}` body into one
 * actionable line. `code` is kept verbatim because the vendor's own docs are
 * written against it — `409 COMMENTS_MARKER_MISMATCH` and `409 CONFLICT` are
 * different problems with different fixes, and both arrive as a bare 409
 * without it.
 */
export function formatTypefullyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TypefullyErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TypefullyErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Typefully ${status} for ${method} ${path}: ${truncate(raw)}`;

  const details = (err.details ?? [])
    .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
    .filter(Boolean)
    .join("; ");

  const parts = [
    `Typefully ${status} ${err.code ?? "ERROR"} for ${method} ${path}`,
    err.message,
    details || undefined,
    status === 429
      ? "Typefully rate-limits per user and per social set; back off and retry " +
        "(see the X-RateLimit-* response headers)"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1200);
}

export class TypefullyClient {
  constructor(private ctx: HookContext) {}

  /** Parsed JSON body. Every documented success response is a JSON object. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — used by the `DELETE` actions, all of which answer 204. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Array-valued query parameters (only `tag` on draft-list today) go over
      // the wire as repeated keys — this backend's FastAPI/pydantic `List[str]`
      // query parameters bind that way by default, not as one comma-joined value.
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
      throw new Error(
        formatTypefullyError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
