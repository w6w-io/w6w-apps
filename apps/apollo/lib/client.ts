import type { HookContext } from "@w6w/types";

/**
 * Apollo REST API v1 client.
 *
 * Everything here was verified on 2026-08-29 against Apollo's own machine-readable
 * OpenAPI 3.1 document. It is not published as a static file: `docs.apollo.io` is a
 * ReadMe.com site, and each `/reference/*` page embeds the **entire** spec inline as
 * `document.api.schema` — 74 paths, fetched from `https://docs.apollo.io/reference/get-current-user-profile`
 * (any reference page carries the same document). Live probes against `api.apollo.io`
 * on the same day confirmed the auth and error shapes below.
 *
 * ## One host, one prefix, one auth header
 *
 * `https://api.apollo.io/api/v1` is the only server the spec declares. Every request
 * carries the credential in the `x-api-key` header (see `auth/api-key.ts`); Apollo also
 * documents an OAuth 2.0 flow, but that is for **partners** acting on behalf of a mutual
 * user, not for a Connection a workspace configures itself, so this app does not offer it.
 *
 * ## Search endpoints take their filters as QUERY PARAMETERS, even though they are POST
 *
 * This is the finding most likely to cost someone a day building against this API by
 * hand. `POST /mixed_people/api_search`, `POST /mixed_companies/search` and several
 * others declare **zero** `requestBody` — every filter is an `in: query` parameter,
 * including array filters, which use PHP/Rails-style bracket notation:
 * `?person_titles[]=CEO&person_titles[]=CTO`. A client that JSON-encodes the filters
 * into the body (the reasonable guess for a POST) sends a request Apollo silently
 * ignores every filter on. {@link appendQuery} builds the array form for any
 * `Record<string, QueryValue>` passed as `query`; a `min`/`max` range filter is simply
 * spelled with its bracket already in the key (`"revenue_range[min]"`), which
 * `appendQuery` then sends as an ordinary scalar — {@link appendRange} exists for the
 * handful of call sites that build a range from two separate numbers instead.
 *
 * Some bulk endpoints mix the two: `POST /people/bulk_match` takes its `details` array
 * as a genuine JSON body, alongside plain (non-bracketed) boolean flags in the query
 * string — both are sent on the same request in `actions/people-bulk-enrich.ts`.
 *
 * ## Three error shapes for the same "something went wrong", by status code
 *
 * | Status | Content type       | Shape                          |
 * | ------ | ------------------ | ------------------------------- |
 * | 401    | `text/plain`        | the message itself, no JSON     |
 * | 422    | `application/json`  | `{"error": "<message>"}`        |
 * | 429    | `application/json`  | `{"message": "<message>"}`      |
 * | other  | usually JSON        | `{"error": "<message>"}` (best-effort) |
 *
 * Confirmed live: `GET /api/v1/users/api_profile` with no key answers `422
 * {"error":"Api key required"}`; with a syntactically-plausible but wrong key it
 * answers `401` with a **plain-text** body (no JSON at all) reading "Invalid API key.
 * See https://docs.apollo.io/reference/authentication for how to authenticate."
 * {@link formatApolloError} tries JSON first and falls back to the raw text, and reads
 * `error` before `message` — a response carrying neither still gets the raw body rather
 * than a bare "HTTP 401".
 *
 * ## Response envelopes are singular-keyed, not `{"data": …}`
 *
 * A create/get/update endpoint wraps its resource under a key named after the resource
 * (`{"contact": {...}}`, `{"account": {...}}`, `{"opportunity": {...}}`), and a search
 * endpoint returns the plural form alongside a `pagination` object
 * (`{"contacts": [...], "pagination": {"page", "per_page", "total_entries", "total_pages"}}`).
 * There is no single unwrap function here, unlike some vendors' `{"data": …}` — each
 * action reads the one or two keys its own endpoint documents.
 *
 * ## Rate limits are real, per-endpoint, and self-reporting
 *
 * Apollo enforces per-minute/hour/day windows **per team, per endpoint** (not per API
 * key) and returns `x-rate-limit-minute` / `x-rate-limit-hourly` / `x-rate-limit-24-hour`
 * plus matching `x-*-usage` and `x-*-requests-left` headers on every successful,
 * authenticated response — a genuinely useful live signal most vendors don't offer.
 * `health/request-rate.ts` reads them off the cheap, 0-credit whoami call. A `429`
 * carries `retry-after` (seconds) instead. See `docs.apollo.io/reference/rate-limits`.
 */

/** The one and only API origin the spec declares. */
export const API_BASE = "https://api.apollo.io/api/v1";

export type Scalar = string | number | boolean;
export type QueryValue = Scalar | Scalar[] | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Serialized with bracket-array notation; see the module doc. */
  query?: Record<string, QueryValue>;
  /** JSON-encoded with `content-type: application/json`. */
  body?: unknown;
}

/** Apollo's pagination envelope, alongside a search endpoint's own resource array. */
export interface ApolloPagination {
  page?: number;
  per_page?: number;
  total_entries?: number;
  total_pages?: number;
}

/** Drop keys the caller left unset so an optional filter never reaches the wire. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/comma-string param into a clean string array, or `undefined`. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Append one query entry, handling Apollo's bracket-array convention.
 *
 * `key: ["a", "b"]` becomes `key[]=a&key[]=b` — the form Apollo's own docs show for
 * every array filter (`person_titles[]`, `organization_ids[]`, …). A scalar is sent
 * plain. `undefined`/`null`/`""` are dropped so an unset optional filter is simply
 * absent rather than sent as the literal string `"undefined"`.
 */
export function appendQuery(usp: URLSearchParams, key: string, value: QueryValue): void {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const v of value) {
      if (v === undefined || v === null || v === "") continue;
      usp.append(`${key}[]`, String(v));
    }
    return;
  }
  usp.append(key, String(value));
}

/**
 * A `{min, max}` range filter, sent as `key[min]` / `key[max]` — the form every
 * `*_range` filter in this API uses (`revenue_range`, `total_funding_range`,
 * `organization_num_jobs_range`, …).
 */
export function appendRange(
  usp: URLSearchParams,
  key: string,
  range: { min?: number | string; max?: number | string } | undefined,
): void {
  if (!range) return;
  if (range.min !== undefined && range.min !== null && range.min !== "") {
    usp.append(`${key}[min]`, String(range.min));
  }
  if (range.max !== undefined && range.max !== null && range.max !== "") {
    usp.append(`${key}[max]`, String(range.max));
  }
}

/** Build a query string from a flat map, using {@link appendQuery} for every entry. */
export function buildQuery(params: Record<string, QueryValue>): URLSearchParams {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) appendQuery(usp, k, v);
  return usp;
}

interface JsonErrorBody {
  error?: unknown;
  message?: unknown;
}

/**
 * Turn one of Apollo's three error shapes into one readable line. See the module doc's
 * error-shape table. Tries JSON first (422/429 and most others); a 401's plain-text
 * body has no JSON to parse, so the raw text is used verbatim.
 */
export function formatApolloError(
  status: number,
  method: string,
  path: string,
  contentType: string,
  raw: string,
): string {
  const looksJson = contentType.includes("json") || raw.trimStart().startsWith("{");
  if (looksJson) {
    try {
      const parsed = JSON.parse(raw) as JsonErrorBody;
      const detail = typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.message === "string"
        ? parsed.message
        : undefined;
      if (detail) return `Apollo ${status} for ${method} ${path}: ${detail}`;
    } catch {
      // fall through to the raw body
    }
  }
  const trimmed = raw.trim();
  const body = trimmed.length > 600
    ? `${trimmed.slice(0, 600)}… (${trimmed.length} bytes)`
    : trimmed;
  return body
    ? `Apollo ${status} for ${method} ${path}: ${body}`
    : `Apollo ${status} for ${method} ${path}`;
}

export class ApolloClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T = unknown>(
    path: string,
    options: { query?: Record<string, QueryValue>; body?: unknown } = {},
  ): Promise<T> {
    return this.request<T>(path, { method: "POST", ...options });
  }

  patch<T = unknown>(
    path: string,
    options: { query?: Record<string, QueryValue>; body?: unknown } = {},
  ): Promise<T> {
    return this.request<T>(path, { method: "PATCH", ...options });
  }

  put<T = unknown>(
    path: string,
    options: { query?: Record<string, QueryValue>; body?: unknown } = {},
  ): Promise<T> {
    return this.request<T>(path, { method: "PUT", ...options });
  }

  async request<T = unknown>(path: string, options: RequestOptions): Promise<T> {
    const res = await this.raw(path, options);
    if (res.status === 204 || !res.text) return undefined as T;
    return JSON.parse(res.text) as T;
  }

  /** The response verbatim, for the one hook (the auth probe) that also reads headers. */
  async raw(
    path: string,
    options: RequestOptions,
  ): Promise<{ status: number; headers: Headers; text: string }> {
    const url = new URL(`${API_BASE}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) appendQuery(url.searchParams, k, v);
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = res.status === 204 ? "" : await res.text();
    if (!res.ok) {
      throw new Error(
        formatApolloError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          res.headers.get("content-type") ?? "",
          text,
        ),
      );
    }
    return { status: res.status, headers: res.headers, text };
  }
}
