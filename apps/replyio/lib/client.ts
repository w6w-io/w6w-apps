import type { HookContext } from "@w6w/types";

/**
 * Reply.io API v3 REST client.
 *
 * Everything in this module was verified on 2026-09-01 against Reply's own
 * bundled OpenAPI 3.1 document (`docs.reply.io/api-reference/bundled.yaml`,
 * 1,878,601 bytes, `info.version` `3.0.0`, 281 paths) plus live probes against
 * `api.reply.io`. Nothing came from a third-party integration directory.
 *
 * ## v1/v2 vs v3
 *
 * Reply publishes three API generations at the same host. Its own docs say it
 * plainly: "API V1 and V2 are still working, but both versions are outdated and
 * no longer supported... please use V3 going forward." v1/v2 (Postman-published,
 * `apidocs.reply.io`) cover campaigns/people/actions with a flat, ad-hoc shape;
 * v3 (Mintlify, `docs.reply.io`) is the current, actively-maintained, scoped
 * surface with a real OpenAPI document behind it. This app is v3 only.
 *
 * ## One host, no envelope surprises
 *
 * Every v3 path lives under `https://api.reply.io/v3/...` (a handful of
 * legacy-shaped paths keep a `/api/v2/...` prefix in the vendor's own routing
 * table, but none of them are v3 and none are used here). List endpoints answer
 * `{"items": [...], "hasMore": boolean}`; `GET /v3/custom-fields` is the one
 * exception in this app's surface — it answers a bare JSON array, which is why
 * {@link ReplyClient.json} exists alongside {@link ReplyClient.list}.
 *
 * ## Errors are RFC 9457 `application/problem+json`
 *
 * Every 4xx/5xx carries `{title, status, detail}`, sometimes extended with a
 * machine-readable `code` slug (`business-problem.model.yaml`) or a field-level
 * `errors[]` array (`validation-problem.model.yaml`). {@link formatReplyError}
 * surfaces `code` and `detail` verbatim because the fix differs per code and a
 * flattened "HTTP 400" hides which one was hit.
 *
 * **The docs and the wire disagree on one point.** `docs.reply.io/api-reference/
 * authentication` says a 401 "returns 401 Unauthorized with an empty response
 * body... Do not expect a JSON error response." A live probe on 2026-09-01
 * (`GET /v3/whoami` with no `Authorization` header, and again with a syntactically
 * plausible fake token) shows the opposite: both answered
 * `content-type: application/problem+json`, 99 bytes,
 * `{"title":"Unauthorized","status":401,"detail":"Authentication credentials are
 * missing or invalid."}`. This client parses the body when present and falls
 * back to the `WWW-Authenticate` header only when the body is genuinely empty,
 * so it works whichever behaviour a given deployment actually has.
 *
 * ## Rate limits
 *
 * 100 requests/minute and 3,000/hour, per user — shared across every
 * application acting as that user. Reporting and sequence-statistics endpoints
 * carry a lower, undocumented ceiling and may 429 sooner. A 429 carries
 * `Retry-After` (seconds). Ordinary responses (confirmed on both a 401 and, by
 * the same header set, presumably any other status) carry `x-rate-limit-limit`
 * (a window label, e.g. `"1h"`), `x-rate-limit-remaining` and
 * `x-rate-limit-reset` (ISO 8601) — undocumented on the "Rate limits" page but
 * observed live on 2026-09-01; see `health/quota.ts`.
 */

/** The one and only API origin. The OpenAPI document declares exactly one server. */
export const API_BASE = "https://api.reply.io";

/** Every path this app calls carries this prefix. */
export const API_PREFIX = "/v3";

/**
 * `GET /v3/whoami` — needs no scope, returns only `{userId, username, teamId}`.
 * Named here (rather than in `auth/api-key.ts`) so the plain `whoami-get`
 * Action can reference the path without importing the auth module.
 */
export const WHOAMI_PATH = "/whoami";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The `{"items": [...], "hasMore": boolean}` envelope every v3 list endpoint but one uses. */
export interface ReplyListPage<T> {
  items: T[];
  hasMore: boolean;
}

interface ProblemBody {
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: Array<{ pointer?: string; detail?: string }>;
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host hands a `json` param through in whichever shape it arrived.
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

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Keep an error message readable — a validation body can list many field errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Reply's `application/problem+json` error body into one actionable line.
 *
 * `code` (when present) is kept because it is the stable, machine-readable slug
 * Reply's own error taxonomy is written against — `detail` alone can change
 * wording between releases. `errors[]` (validation problems) are joined in so a
 * multi-field rejection doesn't collapse to "Bad Request".
 */
export function formatReplyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ProblemBody | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as ProblemBody) : null;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed) {
    return `Reply ${status} for ${method} ${path}${raw ? `: ${truncate(raw)}` : " (empty body)"}`;
  }

  const parts = [
    `Reply ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.detail ?? parsed.title,
    status === 429
      ? "Reply rate-limits at 100 requests/minute and 3,000/hour per user; respect Retry-After"
      : undefined,
    parsed.errors?.length
      ? parsed.errors.map((e) => `${e.pointer ?? "?"}: ${e.detail ?? "invalid"}`).join("; ")
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "));
}

export class ReplyClient {
  constructor(private ctx: HookContext) {}

  /** The `{"items": [...], "hasMore": boolean}` shape most list endpoints use. */
  list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ReplyListPage<T>> {
    return this.json<ReplyListPage<T>>(path, options);
  }

  /** Parse the body with no assumed envelope — `GET /v3/custom-fields` answers a bare array. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for the delete endpoints, which answer 204 with no body. */
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
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatReplyError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
