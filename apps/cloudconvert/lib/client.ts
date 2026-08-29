import type { HookContext } from "@w6w/types";

/**
 * CloudConvert API v2 REST client.
 *
 * Verified on 2026-08-29 against CloudConvert's own documentation
 * (`cloudconvert.com/docs/getting-started/introduction`, `.../api-reference/jobs`,
 * `.../api-reference/tasks`, `.../api-reference/users`, `.../api-reference/webhooks`,
 * `.../api-reference/operations`, `.../import-export/import-files`,
 * `.../import-export/export-files`, `.../operations/convert-files`) plus live probes
 * against `api.cloudconvert.com`, `sync.api.cloudconvert.com` and `status.cloudconvert.com`.
 * Nothing here came from a third-party integration directory.
 *
 * ## Two hosts, not one
 *
 * CloudConvert exposes the **same** `/v2` paths on two hosts, and which one you call
 * changes the contract, not just the latency:
 *
 *  - `https://api.cloudconvert.com` — asynchronous. `POST /v2/jobs` returns immediately
 *    with a job in `processing` status; `GET /v2/jobs/{id}` answers with whatever status
 *    the job happens to be in right now.
 *  - `https://sync.api.cloudconvert.com` — synchronous. The **same paths** block until
 *    the job/task reaches a terminal state (`finished` or `error`) before answering.
 *    CloudConvert's own docs warn against this for long-running jobs (video encodes) —
 *    "your network stack might automatically time out requests if there is not data
 *    transferred for a longer time" — with no documented ceiling of its own, unlike
 *    Apify's hard 60s/300s caps. `convert-url` and `job-create-and-wait` in this app use
 *    it deliberately, for the common case of a fast conversion where polling is overkill.
 *
 * ## One envelope, two pagination shapes
 *
 * Every read answers `{"data": …}` — {@link CloudConvertClient.data} unwraps it — but a
 * **list** endpoint (jobs, tasks, webhooks) additionally wraps `data` in Laravel-style
 * cursor metadata: `links: {first, last, prev, next}` and
 * `meta: {current_page, from, path, per_page, to}`. There is no `total`, unlike Apify's
 * offset/limit pages — CloudConvert's own paginator does not compute one.
 *
 * ## Errors
 *
 * A failure is `{"message", "code", "errors"?}` with a 4xx/5xx status: `code` is a stable
 * machine string (`UNAUTHENTICATED`, `INVALID_DATA`, `TOO_MANY_REQUESTS`, …) and `errors`
 * is a Laravel validation-error map (`{"tasks": ["The tasks field is required."]}`) present
 * only on `422`. {@link formatCloudConvertError} surfaces `code` and the validation detail
 * verbatim, because "422" alone hides which field was wrong.
 *
 * Measured live on 2026-08-29: an **unauthenticated** and an **invalid-bearer** request to
 * `GET /v2/jobs` both answer the identical `401 {"message":"Unauthenticated.","code":
 * "UNAUTHENTICATED"}` — CloudConvert does not distinguish "no credential" from "wrong
 * credential" the way Apify does, so `auth/api-token.ts` does not try to either.
 *
 * ## Rate limits
 *
 * Per CloudConvert's own docs, **only job and task creation** are dynamically
 * rate-limited; those responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining` and,
 * on a `429`, `Retry-After`. Measured live on 2026-08-29: a plain `GET /v2/jobs` and
 * `GET /v2/operations` carry **none** of those headers. So there is no side-effect-free
 * way to read rate-Headroom in advance — reading it would mean spending a create call —
 * which is why `health/request-rate.ts` is a declared absence rather than a probe.
 */

/** Asynchronous host — the vendor's own default. */
export const API_BASE = "https://api.cloudconvert.com";
/** Synchronous host — same paths, blocks until the job/task is terminal. */
export const SYNC_API_BASE = "https://sync.api.cloudconvert.com";
/** Every documented path carries this prefix, on both hosts. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  /** `https://api.cloudconvert.com` (default) or `https://sync.api.cloudconvert.com`. */
  base?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** CloudConvert's Laravel-style cursor page, wrapping `data` on every list endpoint. */
export interface CloudConvertListPage<T> {
  data: T[];
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
  meta?: {
    current_page?: number;
    from?: number | null;
    path?: string;
    per_page?: number;
    to?: number | null;
  };
}

interface CloudConvertErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

/** Normalise a `multiselect` param into a real array for a JSON request body. */
export function toArray(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
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

/** Keep an error message readable — a 422 validation body can list many fields. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn CloudConvert's error body into one actionable line.
 *
 * `code` is kept verbatim because it is what CloudConvert's own docs are written
 * against (`UNAUTHENTICATED`, `INVALID_DATA`, `TOO_MANY_REQUESTS`, …), and the `errors`
 * map — present only on a `422` — names the exact field that failed validation, which a
 * bare "422 Unprocessable Entity" does not.
 */
export function formatCloudConvertError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: CloudConvertErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as CloudConvertErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message && !parsed?.code) {
    return `CloudConvert ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const fieldErrors = parsed.errors
    ? Object.entries(parsed.errors).map(([field, msgs]) => `${field}: ${msgs.join(" ")}`).join("; ")
    : undefined;

  const parts = [
    `CloudConvert ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.message,
    fieldErrors,
    status === 429
      ? "job/task creation is rate-limited; retry after the Retry-After header's delay"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class CloudConvertClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": …}` in, `data` out. The shape of every endpoint in this app's surface. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** The full envelope, including `links`/`meta` — used by the `*-list` actions. */
  async page<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<CloudConvertListPage<T>> {
    return await this.json<CloudConvertListPage<T>>(path, options);
  }

  /** Parse the body without unwrapping. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer `204` with no body (delete, cancel). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const base = options.base ?? API_BASE;
    const url = new URL(`${base}${API_PREFIX}${path}`);
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
        formatCloudConvertError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
