import type { HookContext } from "@w6w/types";

/**
 * Zendesk Sell (Base CRM) API v2 REST client.
 *
 * ## The host never moved
 *
 * The vendor's old public reference lived at `developers.getbase.com`, which now
 * 301-redirects into Zendesk's unified developer docs at
 * `developer.zendesk.com/api-reference/sales-crm/`. **The wire endpoint did not
 * follow that move.** The reference's own "Introduction" page states it in full:
 *
 * > Use the following endpoint to communicate with the api:
 * > https://api.getbase.com
 *
 * verified live on 2026-09-01 (`developer.zendesk.com/api-reference/sales-crm/introduction/`,
 * 200, real content). Every OAuth and resource example on every sub-page uses the
 * same `api.getbase.com` host — never `*.zendesk.com`. There is no version-negotiated
 * or per-account host: every path carries a fixed `/v2` prefix.
 *
 * ## Two response envelopes, and they differ by verb, not by resource
 *
 * A **single resource** (get, create, update, upsert) answers `{"data": {...},
 * "meta": {...}}`. A **collection** (list) answers `{"items": [{"data": {...},
 * "meta": {...}}, ...], "meta": {"type": "collection", "count", "links": {...}}}`
 * — note that each item is wrapped in its own `data`/`meta` pair, not a bare array.
 * Unwrapping only the outer `data` key on a list response silently returns the
 * item envelopes instead of the records.
 *
 * ## Errors have two, unrelated shapes
 *
 * The **OAuth token/authorize/revoke endpoints** answer RFC 6749's shape on
 * failure: `{"error": "invalid_grant", "error_description": "...", "error_uri": "..."}`.
 * The **resource API** (`/v2/contacts`, `/v2/deals`, ...) answers a completely
 * different envelope: `{"errors": [{"error": {"resource", "field", "code",
 * "message", "details"}}], "meta": {"http_status", "logref", "links"}}`. This
 * client only ever talks to the resource API (the auth method owns the OAuth
 * endpoints), so {@link formatSellError} only parses the second shape.
 *
 * ## `User-Agent` is mandatory
 *
 * "All API requests must include a valid User-Agent header. Requests with no
 * User-Agent header will be rejected with 400 Bad Request and the error code
 * `invalid_user_agent`." A sandboxed action worker's `fetch` does not set one by
 * default, so this client stamps one on every request.
 *
 * ## Pagination is page/per_page, not cursor, for every resource this app uses
 *
 * `page` (1-based) and `per_page` (default 25, max 100). The one exception in
 * the whole API is `GET /v2/lead_conversions`, which additionally supports a
 * `cursor` param and a 200-row page cap — not used here, since this app only
 * *creates* lead conversions, it does not list them.
 *
 * ## Rate limiting has no readable headroom
 *
 * 36,000 requests/hour per token (10 req/s), enforced by a bare `429` with no
 * `X-RateLimit-*` response headers documented or observed. See `health/quota.ts`.
 */

export const API_BASE = "https://api.getbase.com";
export const API_PREFIX = "/v2";

/** Stamped on every request — see the module doc for why this is not optional. */
export const USER_AGENT = "w6w-zendesk-sell-app/0.1.0";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** One item inside a collection response — each carries its own envelope. */
interface ItemEnvelope<T> {
  data: T;
  meta?: { type?: string };
}

/** The vendor's offset/page envelope for a collection response. */
export interface SellListResult<T> {
  items: T[];
  count?: number;
  links?: {
    self?: string;
    first_page?: string;
    prev_page?: string;
    next_page?: string;
    last_page?: string;
  };
}

interface SellErrorDetail {
  resource?: string;
  field?: string;
  code?: string;
  message?: string;
  details?: string;
}

interface SellErrorBody {
  errors?: Array<{ error?: SellErrorDetail }>;
  meta?: { http_status?: string; logref?: string };
}

/** Drop keys the caller left unset, so an optional filter is never sent as `"undefined"`. */
export function compact(obj: Record<string, QueryValue>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Parse a comma-separated or already-array `multiselect`/tags value into `string[]`. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
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

/**
 * Turn the resource API's error envelope into one actionable line.
 *
 * `code` is kept verbatim because it is what the vendor's own error-code table
 * is written against (`blank`, `already_exists`, `insufficient_scope`,
 * `rate_limit_exceeded`, ...) — a bare "422 Unprocessable Entity" hides which of
 * those it was, and `field` (a JSON Pointer, e.g. `/data/last_name`) says
 * exactly which attribute the vendor rejected.
 */
export function formatSellError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: SellErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SellErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const first = parsed?.errors?.[0]?.error;
  if (!first) {
    const truncated = raw.length > 600 ? `${raw.slice(0, 600)}… (${raw.length} bytes)` : raw;
    return `Zendesk Sell ${status} for ${method} ${path}: ${truncated}`;
  }

  const parts = [
    `Zendesk Sell ${status} ${first.code ?? "error"} for ${method} ${path}`,
    first.resource && first.field ? `${first.resource} ${first.field}` : first.resource,
    first.message,
    status === 429
      ? "rate limit is 36,000 requests/hour (10/second) per token; retry with backoff"
      : undefined,
  ].filter(Boolean);
  return parts.join(": ");
}

export class SellClient {
  constructor(private ctx: HookContext) {}

  /** `GET` a collection. Unwraps each item's own `data` envelope. */
  async list<T = unknown>(path: string, query: Record<string, QueryValue> = {}): Promise<
    SellListResult<T>
  > {
    const res = await this.send(path, { query });
    const text = await res.text();
    const body = text
      ? (JSON.parse(text) as { items?: ItemEnvelope<T>[]; meta?: SellListMeta })
      : { items: [] };
    return {
      items: (body.items ?? []).map((i) => i.data),
      count: body.meta?.count,
      links: body.meta?.links,
    };
  }

  /** `GET` a single resource. Unwraps `data`. */
  async get<T = unknown>(path: string): Promise<T> {
    const res = await this.send(path, {});
    return this.unwrap<T>(res);
  }

  /** `POST` to create a resource. `metaType`, when given, is sent as `meta.type`. */
  async create<T = unknown>(
    path: string,
    data: Record<string, unknown>,
    metaType?: string,
  ): Promise<T> {
    const body: Record<string, unknown> = { data };
    if (metaType) body.meta = { type: metaType };
    const res = await this.send(path, { method: "POST", body });
    return this.unwrap<T>(res);
  }

  /** `PUT` to update a resource. Unwraps `data`. */
  async update<T = unknown>(path: string, data: Record<string, unknown>): Promise<T> {
    const res = await this.send(path, { method: "PUT", body: { data } });
    return this.unwrap<T>(res);
  }

  /** `DELETE`. The vendor answers `204 No Content` — nothing to unwrap. */
  async remove(path: string): Promise<void> {
    await this.send(path, { method: "DELETE" });
  }

  private async unwrap<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!text) return undefined as T;
    const body = JSON.parse(text) as { data?: T };
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatSellError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

interface SellListMeta {
  count?: number;
  links?: SellListResult<unknown>["links"];
}
