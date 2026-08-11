import type { HookContext } from "@w6w/types";

/**
 * Keap (formerly Infusionsoft) REST client.
 *
 * Every path, verb, query parameter, body field and enum used by this app was
 * read on 2026-08-11 from Keap's own machine-readable OpenAPI 3.1 documents:
 *
 *   V1  https://crm.infusionsoft.com/app/v3/api-docs/V1  344,714 bytes
 *       md5 ec10d44f3f8d61876f8c8af4deb32dc1  ·  92 paths  ·  info.version "v1"
 *   V2  https://crm.infusionsoft.com/app/v3/api-docs/V2  958,308 bytes
 *       md5 85f512657302f58bed63fa8945917c69  ·  236 paths ·  info.version "v2"
 *
 * plus live probes against `api.infusionsoft.com` on the same day. Nothing came
 * from a third-party integration directory. `developer.keap.com` itself is a
 * Redoc shell that serves an identical HTML skeleton for every documentation
 * path, so it is unscrapeable; the two URLs above are what its `config.js`
 * names, and both are public. (`api.infusionsoft.com/crm/rest/v1/openapi.json`
 * is NOT public — it answers 401.)
 *
 * ## One host, one origin, two API versions
 *
 * Both documents declare exactly one server, `https://api.infusionsoft.com/crm`,
 * and every path inside carries its own `/rest/v1` or `/rest/v2` prefix. There
 * is no regional host, no sandbox host and no per-tenant subdomain: a Keap
 * tenant is identified by the credential, never by the URL. That is why
 * {@link API_ORIGIN} is a constant and no Action accepts a host parameter.
 *
 * ## Two error envelopes, and only one of them is in the spec
 *
 * The OpenAPI documents declare every non-2xx response as the `Error` schema —
 * `{code, message, status, details[]}`. That is the *application's* shape, and
 * you only ever see it once a request has been authenticated.
 *
 * Keap fronts the API with an Apigee gateway, and everything the gateway
 * rejects itself — bad or missing credential, throttle, quota — comes back in
 * Apigee's own shape, which appears nowhere in the spec:
 *
 *     {"fault":{"faultstring":"Invalid Access Token",
 *               "detail":{"errorcode":"keymanagement.service.invalid_access_token"}}}
 *
 * Measured, unauthenticated, 2026-08-11. An integration that parses only the
 * documented shape prints `undefined` for exactly the failures that are most
 * common in production. {@link formatKeapError} reads both.
 *
 * ## The 401 that is really a 404 (and vice versa)
 *
 * The gateway authenticates before it routes, so an unauthenticated request to
 * a path that does not exist answers **401, not 404** — measured:
 * `GET /crm/rest/v2/definitely-not-real-zzz` returns the same
 * `oauth.v2.InvalidAccessToken` body as `GET /crm/rest/v2/contacts`. Nothing
 * about endpoint existence can be probed without a credential, and a 404 seen
 * *with* a credential is always a real application 404.
 *
 * ## Pagination differs between the versions
 *
 * V2 is opaque-cursor: `page_size` in, `next_page_token` out, fed back as
 * `page_token`. V1 is offset/limit and returns a *fully-formed absolute URL* in
 * `next`. Neither is convertible into the other, so {@link KeapClient} does not
 * pretend otherwise — see {@link nextPageToken} and {@link offsetOf}.
 *
 * ## Rate limits
 *
 * Documented at developer.infusionsoft.com/api-token-quota-and-usage-measurements:
 * OAuth2 client 1,500/minute and 150,000/day; a Personal Access Token or
 * Service Account Key 10/second, 240/minute and 30,000/day; and, since
 * 2026-06-08, 10,000/minute and 250,000/day per *application instance* (tenant)
 * regardless of token type. Every response carries the readings as headers —
 * see {@link readQuotaHeaders} and `health/quota.ts`.
 */

/** The one and only API origin. Both OpenAPI documents declare this server and no other. */
export const API_ORIGIN = "https://api.infusionsoft.com/crm";

/** Path prefix of the v2 surface. Preferred: it is the vendor's stated direction. */
export const V2 = "/rest/v2";

/**
 * Path prefix of the v1 surface.
 *
 * Used by exactly one resource in this app — Appointments — because v2 has no
 * appointment endpoints at all (236 v2 paths, zero matching `/appointments`).
 * See `actions/appointment-list.ts`.
 */
export const V1 = "/rest/v1";

/**
 * A query-parameter value. A `string[]` is emitted as a **repeated key**, which
 * is not interchangeable with a comma-joined string on this API.
 *
 * Keap declares two array-typed query parameters and serializes them
 * differently, and neither of them says so in its `style`/`explode` (both are
 * absent, so the OpenAPI default of `form` + `explode: true` — repeated keys —
 * applies to both on paper):
 *
 *  - **`fields`** is array-typed on some operations and string-typed on others,
 *    but *every* one of its descriptions reads "Comma-delimited list of …
 *    properties to include in the response". Prose wins; it is sent joined.
 *  - **`update_mask`** on `PATCH /contacts/{id}` carries no such prose, and its
 *    `items.enum` settles it: the allowed values are bare property names, so
 *    `update_mask=given_name,job_title` is not a member of the enum and
 *    `update_mask=given_name&update_mask=job_title` is. It is sent repeated.
 *
 * Getting that backwards on `update_mask` is the failure that silently widens
 * a partial update back into a destructive one — see `actions/contact-update.ts`.
 */
export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with a JSON content type. */
  body?: unknown;
}

/** Keap's application-level error body, as declared by the `Error` schema. */
interface KeapApiError {
  code?: number;
  message?: string;
  status?: string;
  details?: Array<{ message?: string; [k: string]: unknown }>;
}

/** Apigee's gateway fault body. Undocumented in the OpenAPI, universal on the wire. */
interface KeapGatewayFault {
  fault?: {
    faultstring?: string;
    detail?: { errorcode?: string };
  };
}

/**
 * Percent-encode one query-parameter *value* per RFC 3986.
 *
 * `encodeURIComponent` deliberately leaves `!'()*` alone, and for Keap that
 * matters: the vendor's filter grammar uses `*` as a trailing wildcard and the
 * documentation spells the encoded form out — `filter=given_name%3D%3DMar%2A`.
 * Sending a bare `*` almost certainly works, but "almost certainly" is not a
 * reason to diverge from the only form the vendor has written down.
 *
 * `URLSearchParams` is not used for the same reason in reverse: it applies
 * `application/x-www-form-urlencoded` rules, which turn a space into `+` and
 * leave `*` bare, and neither is what these examples show.
 */
export function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful here. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Build the query string for a request.
 *
 * Exported so the encoding above is testable without a fetch: it is the part
 * that decides whether a filter matches anything at all.
 */
export function buildQuery(query: Record<string, QueryValue> = {}): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    // A list means "repeat the key", never "join with a comma". See QueryValue.
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        parts.push(`${encodeQueryValue(key)}=${encodeQueryValue(String(item))}`);
      }
      continue;
    }
    parts.push(`${encodeQueryValue(key)}=${encodeQueryValue(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Compose a Keap v2 `filter` value from field/value pairs.
 *
 * Keap's list endpoints do not take one query parameter per field. They take a
 * single `filter` string in a small expression grammar — `field==value`,
 * clauses joined by `;`, comparison operators `> < >= <=` on the numeric and
 * date fields, and a trailing `*` for prefix matching on the text ones. So
 * `?given_name=Mary` is silently ignored (it is not a declared parameter) while
 * `?filter=given_name==Mary` is the query that works. That single fact is the
 * most common reason a Keap list call "returns everything".
 *
 * Clauses arrive here already carrying their operator so that `>` and `>=`
 * remain expressible; this helper only joins and escapes.
 */
export function joinFilters(clauses: Array<string | undefined>): string | undefined {
  const kept = clauses.map((c) => (c ?? "").trim()).filter(Boolean);
  return kept.length ? kept.join(";") : undefined;
}

/** `field==value`, the ordinary equality clause. Absent value -> no clause. */
export function eq(field: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return `${field}==${value}`;
}

/** Keep an error message readable — a validation body can list every field. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied id so a pasted `/` or `?` cannot re-target the request. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * The stable machine code behind a Keap failure, from whichever envelope
 * carried it.
 *
 * The gateway's `fault.detail.errorcode` is preferred because it is the field
 * whose values are stable and enumerable (`oauth.v2.InvalidAccessToken`,
 * `keymanagement.service.invalid_access_token`, the `policies.ratelimit.*`
 * family). The application's `Error.status` is the fallback.
 */
export function keapErrorCode(raw: string): string | undefined {
  let parsed: (KeapGatewayFault & KeapApiError) | null = null;
  try {
    parsed = JSON.parse(raw) as KeapGatewayFault & KeapApiError;
  } catch {
    return undefined;
  }
  return parsed?.fault?.detail?.errorcode ?? parsed?.status ?? undefined;
}

/**
 * Turn either Keap error envelope into one actionable line.
 *
 * The machine code is kept verbatim because it is what tells the two 401s
 * apart, and they have different fixes — see `auth/oauth2.ts`.
 *
 * The message can only ever carry Keap's own prose plus the caller's own input.
 * No credential reaches this module.
 */
export function formatKeapError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (KeapGatewayFault & KeapApiError) | null = null;
  try {
    parsed = JSON.parse(raw) as KeapGatewayFault & KeapApiError;
  } catch { /* not JSON — fall through to the raw body */ }

  const fault = parsed?.fault;
  const code = fault?.detail?.errorcode ?? parsed?.status;
  const message = fault?.faultstring ?? parsed?.message;
  const details = (parsed?.details ?? [])
    .map((d) => d?.message)
    .filter((m): m is string => typeof m === "string" && m.length > 0);

  if (!message && details.length === 0) {
    return `Keap ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Keap ${status}${code ? ` ${code}` : ""} for ${method} ${path}`,
    message,
    details.length ? details.join("; ") : undefined,
    status === 429
      ? "Keap throttles per token and per tenant; retry with exponential backoff and honour retry-after"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * A quota reading lifted off Keap's response headers.
 *
 * `limit`/`available`/`used` are numbers where Keap sent numbers, and `window`
 * is the human window the vendor's `time-unit` + `interval` headers describe
 * ("1 minute", "1 day").
 */
export interface KeapQuotaReading {
  id: string;
  limit?: number;
  available?: number;
  used?: number;
  window?: string;
}

function num(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Split one of Keap's throttle headers into its per-window components.
 *
 * The vendor's documented table describes each of these as a single scalar —
 * "x-keap-tenant-throttle-time-unit … Currently 'minute' for all consumers".
 * The wire disagrees, and it disagrees in a way that silently corrupts a naive
 * `Number(header)`: measured on 2026-08-11, an unauthenticated response carried
 *
 *     x-keap-tenant-throttle-time-unit: minute|day
 *     x-keap-tenant-throttle-interval: 1|1
 *
 * i.e. the tenant throttle is TWO windows in one header set, pipe-delimited and
 * positionally aligned — which matches the documented per-application-instance
 * pair of 10,000/minute and 250,000/day exactly. `Number("1|1")` is `NaN`, so a
 * reader that assumes the documented scalar reports nothing at all rather than
 * reporting wrong; either way it loses the reading it came for.
 *
 * This helper therefore always returns a list, of length one for the scalar
 * form and length N for the pipe form.
 */
export function splitHeaderWindows(value: string | null | undefined): string[] {
  if (value === null || value === undefined) return [];
  return value.split("|").map((s) => s.trim());
}

/** The three header families Keap documents, as `id` -> header-name prefix. */
export const QUOTA_HEADER_FAMILIES = [
  { id: "product-quota", prefix: "x-keap-product-quota" },
  { id: "product-throttle", prefix: "x-keap-product-throttle" },
  { id: "tenant-throttle", prefix: "x-keap-tenant-throttle" },
] as const;

/**
 * Read every quota/throttle reading Keap put on a response.
 *
 * Returns one entry per family per window, so the pipe-delimited tenant
 * throttle yields `tenant-throttle` and `tenant-throttle[1]` rather than one
 * mangled row. A family whose headers are absent, or present-but-empty (which
 * is what an unauthenticated response carries), contributes nothing.
 */
export function readQuotaHeaders(headers: Headers): KeapQuotaReading[] {
  const out: KeapQuotaReading[] = [];
  for (const family of QUOTA_HEADER_FAMILIES) {
    const limits = splitHeaderWindows(headers.get(`${family.prefix}-limit`));
    const availables = splitHeaderWindows(headers.get(`${family.prefix}-available`));
    const useds = splitHeaderWindows(headers.get(`${family.prefix}-used`));
    const units = splitHeaderWindows(headers.get(`${family.prefix}-time-unit`));
    const intervals = splitHeaderWindows(headers.get(`${family.prefix}-interval`));

    const windows = Math.max(limits.length, availables.length, useds.length, units.length);
    for (let i = 0; i < windows; i++) {
      const limit = num(limits[i]);
      const available = num(availables[i]);
      const used = num(useds[i]);
      if (limit === undefined && available === undefined && used === undefined) continue;
      const unit = (units[i] ?? "").trim();
      const interval = (intervals[i] ?? "").trim();
      out.push({
        id: i === 0 ? family.id : `${family.id}[${i}]`,
        limit,
        available,
        used,
        window: unit ? `${interval || "1"} ${unit}` : undefined,
      });
    }
  }
  return out;
}

/** V2's opaque cursor. Absent or empty means "no more pages". */
export function nextPageToken(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const token = (body as { next_page_token?: unknown }).next_page_token;
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

/**
 * V1's `next` is an absolute URL, not a cursor. Callers page by `offset`, so
 * this reads the offset back out rather than handing on a URL an Action would
 * have to fetch blind (and which the sandbox would have to re-allowlist).
 */
export function offsetOf(url: string | undefined): number | undefined {
  if (!url) return undefined;
  try {
    const value = new URL(url).searchParams.get("offset");
    if (value === null) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

export class KeapClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. `202`/`204` and an empty body yield `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 202 || res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Status only, for the endpoints that answer with no body.
   *
   * Two of them in this app's surface, and neither is obvious from the
   * schemas: `POST /rest/v2/emails:send` is declared **202 Accepted with no
   * content** (it queues), and `POST …/contacts:removeTags` is 204.
   */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  /** The parsed body plus the response headers, for the quota probe. */
  async withHeaders<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ body: T; headers: Headers; status: number }> {
    const res = await this.send(path, options);
    const text = res.status === 204 ? "" : await res.text();
    return {
      body: (text ? JSON.parse(text) : undefined) as T,
      headers: res.headers,
      status: res.status,
    };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = `${API_ORIGIN}${path}${buildQuery(options.query)}`;
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    // ctx.fetch, never the global: the sandbox denies the global and the host
    // is what attaches the credential.
    const res = await this.ctx.fetch(url, init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatKeapError(res.status, method, path, detail));
    }
    return res;
  }
}
