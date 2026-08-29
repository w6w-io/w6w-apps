import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Kustomer REST API client.
 *
 * Verified 2026-08-29 against Kustomer's own hosted OpenAPI documents
 * (developer.kustomer.com/kustomer-api-docs — the "Core Resources" and
 * "Access Management" categories, fetched as machine-readable OAS 3.0 JSON
 * embedded in each reference page) plus the prose reference pages
 * (Getting Started, Authentication, Pagination, Rate limiting, Errors).
 *
 * ## Every organization has its own host
 *
 * Kustomer, like Freshdesk and Zendesk, is addressed at a per-organization
 * subdomain: `https://{orgname}.api.kustomerapp.com`. The vendor's own
 * "Getting started" page states this explicitly and warns that omitting the
 * org name produces a cross-pod auth error ("Auth token associated with pod
 * prod2 but request is being handled by prod1"). A static manifest cannot
 * enumerate every org, so `w6w.network.allow` declares the wildcard
 * `*.api.kustomerapp.com`; the runtime's egress matcher accepts any
 * subdomain of it while refusing everything else.
 *
 * The org subdomain is collected as an Auth field (it identifies the
 * account, so it belongs to the Connection, not to an Action param).
 * `afterConnect` echoes it onto the connection's display data, which is
 * where this client reads it from — mirroring `apps/freshdesk/lib/client.ts`.
 *
 * ## Response envelope
 *
 * Every endpoint answers a JSON:API-flavoured envelope:
 * `{"data": {"type", "id", "attributes", "relationships", "links"}}` for a
 * single record, or `{"data": [...], "meta": {...}, "links": {...}}` for a
 * list. {@link KustomerClient.data} unwraps the single-record case;
 * {@link KustomerClient.json} returns the envelope untouched for list
 * endpoints, which callers need for `meta`/pagination.
 *
 * ## Errors
 *
 * A non-2xx response body is `{"errors": [{"code", "message"}]}` (verified
 * against the OAS `ErrorResponse` schema and its `BadRequestError` /
 * `Unauthorized` examples). `formatKustomerError` surfaces the vendor's own
 * `code` because the fix differs per code.
 *
 * ## Pagination
 *
 * Page-number pagination via `?page=` and `?pageSize=` query params (default
 * and max page size is typically 100 per the vendor's own Pagination page).
 *
 * ## Rate limits
 *
 * Every response carries `x-ratelimit-limit`, `x-ratelimit-remaining`, and
 * (only once exceeded) `x-ratelimit-reset` — verified against the vendor's
 * own Rate limiting reference page.
 */

export const API_VERSION_PREFIX = "/v1";

export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { orgSubdomain?: string };
  if (display.orgSubdomain) return display.orgSubdomain;
  throw new Error(
    "Kustomer connection has no org subdomain recorded — reconnect the account so it can be saved.",
  );
}

export function baseUrl(orgSubdomain: string): string {
  return `https://${orgSubdomain}.api.kustomerapp.com${API_VERSION_PREFIX}`;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * Defaults to `application/json`. `PATCH /v1/conversations/{id}` is the one
   * documented exception: its OAS request body is declared under
   * `application/json-patch+json` even though the payload is a flat partial
   * object, not an RFC 6902 patch array — verified against the Core
   * Resources OAS.
   */
  contentType?: string;
}

/** Drop keys the caller left unset so a partial update doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
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

interface KustomerErrorBody {
  errors?: Array<{ code?: string; message?: string }>;
}

/**
 * Turn Kustomer's `{"errors": [...]}` body into one actionable line. The
 * `code` is kept because the vendor's error taxonomy (`bad_request`,
 * `unauthorized`, `not_found`, ...) is documented and the fix differs per
 * code, which a flattened "HTTP 400" would hide.
 */
export function formatKustomerError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: KustomerErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as KustomerErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const errors = parsed?.errors;
  if (!errors || errors.length === 0) {
    return `Kustomer ${status} for ${method} ${path}: ${raw.slice(0, 600)}`;
  }
  const detail = errors.map((e) => `${e.code ?? "error"}: ${e.message ?? ""}`).join("; ");
  return `Kustomer ${status} for ${method} ${path}: ${detail}`;
}

export class KustomerClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(domainFromConnection(ctx.connection));
  }

  /** `{"data": …}` in, `data` out. The shape of every single-record endpoint. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** Parse the body without unwrapping — used by list endpoints, which need `meta`/`links` too. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = options.contentType ?? "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatKustomerError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
