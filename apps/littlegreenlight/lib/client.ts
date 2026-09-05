import type { HookContext } from "@w6w/types";

/**
 * Little Green Light (LGL) API v1 REST client.
 *
 * Verified 2026-09-05 against LGL's own machine-readable reference — the
 * Swagger 1.2 index at `https://api.littlegreenlight.com/api-docs/json/api-docs.json`
 * (33 resources, each with its own per-resource sub-document at
 * `/api-docs/json/lgl_api/v1/{resource}.json`) — plus live unauthenticated and
 * garbage-credential probes against `api.littlegreenlight.com`.
 *
 * ## One host, `basePath: /api`, every path suffixed `.json`
 *
 * Every endpoint hangs off `https://api.littlegreenlight.com/api/v1/...json`
 * (the Swagger index's `basePath` is `/api`; every resource doc's paths start
 * `/v1/...`). Bodies and responses are JSON.
 *
 * ## Auth: Bearer, NOT the Basic the bare 401 implies
 *
 * A request with no `Authorization` header at all answers:
 *
 *     HTTP/1.1 401 Unauthorized
 *     WWW-Authenticate: Basic realm="API"
 *     HTTP Basic: Access denied.
 *
 * — an HTML body from a generic Rack::Auth::Basic-shaped middleware. But a
 * request that DOES send `Authorization: Bearer <garbage>` gets a second,
 * more specific 401 instead:
 *
 *     WWW-Authenticate: Bearer realm="Rack::OAuth2 Protected Resources", error="invalid_token", ...
 *     {"error":"invalid_token","error_description":"The access token provided is expired, revoked, malformed or invalid for other reasons."}
 *
 * This is the real scheme — confirmed independently by a third-party open
 * source LGL client (`lgl-mcp-server` on npm, source at
 * `github.com/WillHeadlee/Little-Green-Light-MCP-Server`), which calls
 * `https://api.littlegreenlight.com/api/v1` with
 * `Authorization: Bearer ${LGL_API_KEY}`. A caller that trusts the FIRST
 * `WWW-Authenticate` header it sees and reaches for HTTP Basic would spend a
 * day on a scheme this API doesn't actually use — `auth/bearer-token.ts`'s
 * `test` hook classifies on the JSON `error`/`error_description` body, not
 * either bare status or either challenge header.
 *
 * ## Search filters are an array of embedded `key=value` strings
 *
 * Every documented `/search.json` endpoint takes a REQUIRED, repeatable
 * `q[]` query parameter whose own worked examples read `q[]=name=brady` and
 * `q[]=updated_from=2016-01-01` — i.e. each array entry is itself a
 * `field=value` filter clause, not a single free-text search term. Sending
 * `q[]=brady` (a bare term, the natural first guess) is a differently-shaped
 * request the API does not document as matching anything by name.
 * `qFilters` builds that array from a plain object of filter clauses.
 *
 * ## One list envelope shared by every one of the 33 resources
 *
 * Every list endpoint (plain index AND search) wraps its `items` in the same
 * shape, confirmed identical across the `constituents`/`gifts`/`notes`/
 * `appeals`/`campaigns`/`funds`/`groups` sub-documents:
 *
 *     { api_version, items_count, total_items, limit, offset, next_item, next_link, item_type, items: [...] }
 *
 * `total_items` and `next_link` are what a caller needs for pagination —
 * there is no separate "Pagination" section in the reference; this envelope
 * IS it, for every resource, uniformly.
 */

export const API_BASE = "https://api.littlegreenlight.com";
export const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  /** Extra `q[]` filter clauses, each already in `field=value` form. */
  filters?: string[];
  body?: unknown;
}

/** The one list envelope shared by every documented LGL resource. */
export interface LglListEnvelope<T> {
  api_version?: number;
  items_count?: number;
  total_items?: number;
  limit?: number;
  offset?: number;
  next_item?: number | null;
  next_link?: string | null;
  item_type?: string;
  items: T[];
}

interface LglOAuthErrorBody {
  error?: string;
  error_description?: string;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn an LGL error body into one actionable line. The one shape confirmed
 * live is the OAuth2-style `{"error": "...", "error_description": "..."}` a
 * bad/garbage Bearer token gets — falls back to quoting the raw body when it
 * doesn't parse as that shape (LGL's own reference documents no error
 * schema for any other status).
 */
export function formatLglError(status: number, method: string, path: string, raw: string): string {
  let parsed: LglOAuthErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LglOAuthErrorBody;
  } catch { /* not JSON */ }

  if (parsed?.error) {
    const detail = parsed.error_description ? `: ${parsed.error_description}` : "";
    return `LGL ${status} for ${method} ${path}: ${parsed.error}${detail}`;
  }
  return `LGL ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
}

/**
 * Build the `q[]` filter clauses LGL's search endpoints require — each
 * array entry is a `field=value` string, matching the vendor's own worked
 * examples (`q[]=name=brady`). Keys with an unset value are dropped.
 */
export function qFilters(filters: Record<string, QueryValue>): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    out.push(`${key}=${value}`);
  }
  return out;
}

/** Drop keys the caller left unset, so an unset filter is omitted rather than sent empty. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

export class LglClient {
  constructor(private ctx: HookContext) {}

  /** GET a list envelope. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<LglListEnvelope<T>> {
    const res = await this.send("GET", path, options);
    const text = await res.text();
    if (!text) return { items: [] };
    return JSON.parse(text) as LglListEnvelope<T>;
  }

  /** GET a single resource. */
  async get<T = unknown>(path: string): Promise<T> {
    const res = await this.send("GET", path, {});
    return JSON.parse(await res.text()) as T;
  }

  /** POST a create body. */
  async create<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await this.send("POST", path, { body });
    return JSON.parse(await res.text()) as T;
  }

  private async send(method: string, path: string, options: RequestOptions): Promise<Response> {
    // Every documented path carries a `.json` extension (e.g. `/v1/campaigns.json`) —
    // added here so every call site can pass the plain resource path.
    const url = new URL(`${API_BASE}${API_PREFIX}${path}.json`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    for (const clause of options.filters ?? []) {
      url.searchParams.append("q[]", clause);
    }

    const res = await this.ctx.fetch(url.toString(), {
      method,
      headers: {
        accept: "application/json",
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLglError(res.status, method, url.pathname, detail));
    }
    return res;
  }
}
