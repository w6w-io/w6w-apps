import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Clio Manage API v4 REST client (`app.clio.com` and its three regional
 * siblings).
 *
 * Everything in this module was verified on 2026-08-24 against Clio's own
 * machine-readable OpenAPI 3.1 document
 * (`docs.developers.clio.com/openapi.json`, 3,217,360 bytes, `info.title`
 * "Clio API Documentation", `info.version` `v4`), the Docusaurus prose pages
 * it links (Authorization, Fields, Pagination, Rate Limits, Permissions), and
 * live probes against `app.clio.com` and its three regional hosts. Nothing
 * here came from a third-party integration directory.
 *
 * ## Four hosts, not one
 *
 * The OpenAPI document's `servers` block lists four regional production
 * hosts — `app.clio.com` (US), `eu.app.clio.com`, `ca.app.clio.com`,
 * `au.app.clio.com` — and Clio's own prose is explicit that a workspace
 * created in one region lives on that region's host only, with no
 * cross-region fallback. All four were probed live on 2026-08-24 and answer
 * identically (`GET /api/v4/users/who_am_i.json` unauthenticated → `401`;
 * `GET /oauth/authorize` → `302`), so the OAuth authorize/token endpoints are
 * ALSO per-region, not a separate shared host.
 *
 * The region is collected once, at connect time, as one of four sibling Auth
 * methods (`auth/oauth2.ts` for US, `oauth2-eu.ts`, `oauth2-ca.ts`,
 * `oauth2-au.ts`) — mirroring `apps/docusign`'s production/demo split — because
 * the authorize URL must be decided BEFORE the browser redirect and so cannot
 * be a connect-time form field. Each variant's `afterConnect` records
 * `region` on the Connection's `display`, the same pattern `apps/customerio`
 * uses for its US/EU Track API split; every Action reads it back via
 * {@link apiBase} so the request lands on the same host the credential was
 * issued by.
 *
 * ## Two shapes of 401, not one
 *
 * This is the finding that would cost the most time to rediscover. Probed
 * live on 2026-08-24 against `GET /api/v4/users/who_am_i.json`:
 *
 *  - **No `Authorization` header at all** (or a header that isn't a
 *    `Bearer` token) → the OpenAPI-documented `Error` schema:
 *    `{"error": {"type": "UnauthorizedError", "message": "User is not authorized"}}`.
 *  - **A syntactically well-formed but invalid/expired/revoked bearer
 *    token** → an RFC 6750 Bearer challenge instead, both as a
 *    `WWW-Authenticate: Bearer realm="...", error="invalid_token", …` header
 *    AND as a body whose `error` field is a **bare string**, not an object:
 *    `{"error": "invalid_token", "error_description": "The access token provided is expired, revoked, malformed or invalid for other reasons."}`.
 *
 * Code that assumes `body.error.type` — the only shape the OpenAPI document
 * actually declares — throws on the second, far more common, case (an
 * expired 30-day access token). {@link formatClioError} distinguishes both
 * shapes explicitly rather than assuming one.
 *
 * ## Fields default to almost nothing
 *
 * Per Clio's own Fields guide: "If the [`fields`] parameter isn't included,
 * the response will return a minimal set of default fields... For most
 * endpoints, the `id` and `etag` fields are the only default fields
 * returned." A first-time caller who reads an endpoint's documented response
 * shape and calls it without `fields` gets back next to nothing. Every list
 * and get Action in this app therefore prefills a sensible `fields` value
 * (`lib/params.ts`) rather than defaulting to Clio's own near-empty default.
 *
 * ## Pagination is cursor-based by default, and paged in the URL
 *
 * `meta.paging.next` / `meta.paging.previous` in a list response are full
 * URLs, not opaque tokens — `https://app.clio.com/api/v4/contacts?fields=...&page_token=...`.
 * This client extracts just the `page_token` query value with
 * {@link nextPageToken}, so an Action's own "next page" output is a short
 * token rather than a vendor URL a caller would have to parse again. Cursor
 * pagination (the default, `order=id(asc)`, no `offset`) has no total-record
 * ceiling; offset pagination is capped at 10,000 records and rejects a
 * request past that with `422 ArgumentError`.
 *
 * ## Rate limiting
 *
 * Every response — success and 4xx alike — is documented to carry
 * `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` (a Unix
 * timestamp). Measured live on 2026-08-24: none of the three appear on a
 * `401` from a request that never reached a real access token (no header at
 * all, or a syntactically bogus one) — rate limiting is scoped to a *token*,
 * so a request that never authenticates has no per-token bucket to report.
 * `health/quota.ts` treats their absence as `unknown`, not as "no limit".
 * Default: 50 requests/minute during each region's peak hours, higher off-peak,
 * "may change without notice" — so the headers are the only true source, never
 * a hard-coded number.
 */

export type ClioRegion = "us" | "eu" | "ca" | "au";

export const API_HOST: Record<ClioRegion, string> = {
  us: "app.clio.com",
  eu: "eu.app.clio.com",
  ca: "ca.app.clio.com",
  au: "au.app.clio.com",
};

export const API_PREFIX = "/api/v4";

export function apiHost(region: ClioRegion): string {
  return API_HOST[region];
}

export function apiBaseFor(region: ClioRegion): string {
  return `https://${API_HOST[region]}${API_PREFIX}`;
}

/**
 * Read the region an Auth variant's `afterConnect` recorded on the
 * Connection's `display`. Defaults to `us` only when the Connection predates
 * this field or `display` is absent (e.g. a mocked `HookContext` in a test) —
 * never used to guess a real workspace's actual region.
 */
export function regionFromConnection(connection: RedactedConnection | undefined): ClioRegion {
  const display = (connection?.display ?? {}) as { region?: string };
  const region = display.region;
  return region === "eu" || region === "ca" || region === "au" ? region : "us";
}

/** The API base URL for this invocation's Connection. */
export function apiBase(ctx: HookContext): string {
  return apiBaseFor(regionFromConnection(ctx.connection));
}

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as `{"data": body}` with `content-type: application/json`. */
  body?: unknown;
  headers?: Record<string, string>;
}

interface ClioObjectErrorBody {
  error?: { type?: string; message?: string };
}

interface ClioBearerErrorBody {
  error?: string;
  error_description?: string;
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
 * Build a nested `{id}` reference for a create/update payload, e.g.
 * `{client: {id: 123}}`. Returns `undefined` when no id was given, so
 * `compact` drops the key entirely rather than sending `{client: {}}`.
 */
export function idRef(id: unknown): { id: number } | undefined {
  if (id === undefined || id === null || id === "") return undefined;
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(n)) throw new Error(`expected a numeric id, got ${JSON.stringify(id)}`);
  return { id: n };
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Clio's error body into one actionable line, handling BOTH documented
 * 401 shapes (see the module doc) plus the plain `{"error": {...}}` shape
 * every other 4xx uses.
 */
export function formatClioError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }

  if (parsed && typeof parsed === "object" && "error" in parsed) {
    const errField = (parsed as ClioObjectErrorBody & ClioBearerErrorBody).error;
    if (typeof errField === "string") {
      // The RFC 6750 bearer-challenge shape: `error` is a bare string.
      const description = (parsed as ClioBearerErrorBody).error_description;
      return truncate(
        `Clio ${status} ${errField} for ${method} ${path}${description ? `: ${description}` : ""}`,
      );
    }
    if (errField && typeof errField === "object") {
      const { type, message } = errField as { type?: string; message?: string };
      return truncate(
        `Clio ${status} ${type ?? "error"} for ${method} ${path}${message ? `: ${message}` : ""}`,
      );
    }
  }
  return truncate(`Clio ${status} for ${method} ${path}: ${raw}`);
}

/**
 * Extract the `page_token` query value from a `meta.paging.next` /
 * `.previous` URL, so an Action hands back a short token instead of a full
 * vendor URL. `undefined` when there is no next/previous page, matching the
 * vendor's own "the field will be omitted" behaviour.
 */
export function nextPageToken(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).searchParams.get("page_token") ?? undefined;
  } catch {
    return undefined;
  }
}

export interface ClioListEnvelope<T> {
  data: T[];
  meta?: { paging?: { next?: string; previous?: string } };
}

export interface ClioListResult<T> {
  items: T[];
  nextPageToken?: string;
  previousPageToken?: string;
}

export class ClioClient {
  constructor(private ctx: HookContext) {}

  private base(): string {
    return apiBase(this.ctx);
  }

  /** `{"data": …}` in, `data` out. Every non-list, non-download endpoint. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** A list endpoint: unwraps `data` AND extracts `meta.paging` as short tokens. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ClioListResult<T>> {
    const body = await this.json<ClioListEnvelope<T>>(path, options);
    return {
      items: body.data ?? [],
      nextPageToken: nextPageToken(body.meta?.paging?.next),
      previousPageToken: nextPageToken(body.meta?.paging?.previous),
    };
  }

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — Clio's delete endpoints answer `204` with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  /**
   * Follow a `303 See Other` download redirect WITHOUT letting the sandbox's
   * `ctx.fetch` auto-follow it — the `Location` is a pre-signed, per-request
   * URL on a Clio-operated S3 bucket whose exact host varies by region and
   * cannot be a static manifest allowlist entry. Returns the location itself
   * rather than the downloaded bytes; see `actions/document-download-get.ts`.
   */
  async redirectLocation(path: string, options: RequestOptions = {}): Promise<string> {
    const res = await this.send(path, { ...options, headers: { ...options.headers } }, "manual");
    if (res.status !== 303 && res.status !== 302) {
      throw new Error(`Clio ${res.status} for GET ${path}: expected a redirect to a download URL`);
    }
    const location = res.headers.get("location");
    if (!location) throw new Error(`Clio returned ${res.status} for GET ${path} with no Location`);
    return location;
  }

  private async send(
    path: string,
    options: RequestOptions,
    redirect: RequestInit["redirect"] = "follow",
  ): Promise<Response> {
    const url = new URL(`${this.base()}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers, redirect };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify({ data: options.body });
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (redirect === "manual" && (res.status === 303 || res.status === 302)) return res;
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatClioError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
