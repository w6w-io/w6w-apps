import type { HookContext } from "@w6w/types";

/**
 * JobNimbus "Open API" REST client.
 *
 * Everything here was verified on 2026-09-01 against JobNimbus's own Postman
 * collection ("JobNimbus Public API"), reachable only via
 * https://documenter.getpostman.com/view/3919598/S11PpG4x — the exact URL
 * JobNimbus's own support article links to
 * (support.jobnimbus.com/how-do-i-create-an-integration-using-jobnimbuss-open-api,
 * titled "How Do I Use JobNimbus' Open API? (API Documentation)") — plus live
 * probes against `app.jobnimbus.com`. Nothing here came from a third-party
 * integration directory.
 *
 * ## There is no `developers.jobnimbus.com`
 *
 * That is the obvious guess for a vendor dev-docs host and it does not
 * resolve (NXDOMAIN, checked 2026-09-01). `api.jobnimbus.com` DOES resolve —
 * to a bare AWS API Gateway that answers `{"message":"Not Found"}` on every
 * path tried (root, `/v1`, `/contacts`, ...) — and is unrelated to this app's
 * surface; it is not the same deployment as `app.jobnimbus.com/api1`. The
 * only path to the real documentation is the support-article link above.
 *
 * ## One host, one prefix
 *
 * The base URL is `https://app.jobnimbus.com/api1/` — the SAME host that
 * serves the JobNimbus web app itself, not a dedicated API subdomain. A
 * `/v2/` prefix exists on a handful of newer resources (Products,
 * MaterialOrders, WorkOrders, Estimates, Invoices) this app does not cover.
 *
 * ## Two response shapes
 *
 * A **list** endpoint (`GET /contacts`, `GET /jobs`, ...) answers
 * `{"count": N, "results": [...]}`. A **single-resource** endpoint
 * (get/create/update by `jnid`) answers the record itself, with no envelope.
 * {@link JobNimbusClient.list} and {@link JobNimbusClient.single} make that
 * split explicit rather than guessing per call.
 *
 * ## "Delete" is a soft-delete PUT
 *
 * The collection documents only GET, PUT and POST — there is no DELETE verb
 * anywhere in it. What it calls "Delete a Contact" / "Delete a Job" /
 * "Delete a Task" is `PUT .../<jnid>` with body `{"is_active": false}`: the
 * record is deactivated, not removed, and its history stays intact.
 * {@link JobNimbusClient.deactivate} is that call by an honest name.
 *
 * ## Auth
 *
 * `Authorization: Bearer <token>` — see `auth/bearer-token.ts`. The token is
 * a single static "API Key," scoped by an assignable JobNimbus "Access
 * Profile," minted from Settings > Integration Settings > API.
 *
 * ## The `actor` parameter
 *
 * Every endpoint accepts an optional `?actor=<email>` query parameter. When
 * the API token's Access Profile has admin-level permissions, `actor` makes
 * the request inherit a *specific team member's* permissions and
 * attribution: a created record's "Created By" becomes that person, and a
 * `GET` against a limited-access actor's email returns only what that person
 * can see. It is exposed as an optional param on every action in this app
 * rather than folded into the credential, because it varies per call, not
 * per Connection.
 *
 * ## Errors
 *
 * An unauthenticated or bad-token request answers
 * `{"status": 401, "body": "Authentication required"}` — confirmed live
 * 2026-09-01, byte-identical whether the token is missing or merely wrong.
 * Other failures are not shape-documented by the vendor; {@link formatError}
 * reads a `body`/`message`/`error` field if the response is JSON and falls
 * back to the raw text otherwise, rather than assuming one fixed shape.
 */

export const API_BASE = "https://app.jobnimbus.com/api1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** JobNimbus's list envelope. */
export interface JobNimbusListPage<T> {
  count: number;
  results: T[];
}

interface ErrorBody {
  status?: number;
  body?: string;
  message?: string;
  error?: string;
}

/**
 * Turn a failed response into one actionable line.
 *
 * `body` is the field JobNimbus's own 401 uses (`{"status":401,"body":
 * "Authentication required"}`); `message`/`error` are read as fallbacks for
 * the failure shapes the vendor does not document but a REST-ish API
 * plausibly uses. If none parse, the raw (truncated) text is kept rather than
 * silently dropped.
 */
export function formatError(status: number, method: string, path: string, raw: string): string {
  let parsed: ErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ErrorBody;
  } catch { /* not JSON — fall through to the raw text */ }

  const detail = parsed?.body ?? parsed?.message ?? parsed?.error;
  if (detail) return `JobNimbus ${status} for ${method} ${path}: ${detail}`;
  const text = raw.trim();
  return text
    ? `JobNimbus ${status} for ${method} ${path}: ${truncate(text)}`
    : `JobNimbus ${status} for ${method} ${path}`;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Drop keys the caller left unset. `false` and `0` survive — only nullish/empty-string is dropped. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Path-escape a caller-supplied `jnid`. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed —
 * the host hands a `json`-typed param through in whichever shape it arrived.
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

export class JobNimbusClient {
  constructor(private ctx: HookContext) {}

  /** A list endpoint — `{"count", "results"}`. */
  async list<T = Record<string, unknown>>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<JobNimbusListPage<T>> {
    const body = await this.send(path, { query });
    return (body ?? { count: 0, results: [] }) as JobNimbusListPage<T>;
  }

  /** A single-resource endpoint — the record itself, no envelope. */
  async single<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    return await this.send(path, options) as T;
  }

  /** `PUT <path> {"is_active": false}` — JobNimbus's only "delete." */
  async deactivate<T = Record<string, unknown>>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<T> {
    return await this.send(path, { method: "PUT", body: { is_active: false }, query }) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<unknown> {
    const url = new URL(`${API_BASE}${path}`);
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
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`JobNimbus returned a non-JSON body for ${init.method} ${url.pathname}`);
    }
  }
}
