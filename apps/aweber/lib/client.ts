import type { HookContext } from "@w6w/types";

/**
 * AWeber API v1 REST client (`api.aweber.com/1.0`).
 *
 * Everything in this module was verified on 2026-09-05 against AWeber's own
 * machine-readable OpenAPI 3.0.2 document, served — fully resolved, `$ref`s
 * and all — as the embedded Redoc state at `https://api.aweber.com/` (the
 * page titled "AWeber API & Webhook Documentation") and, in raw un-resolved
 * form, at `https://api.aweber.com/swagger.yaml`. Both were fetched live;
 * nothing here came from a third-party integration directory.
 *
 * `https://developers.aweber.com/` — the URL a search engine points at —
 * redirects (301) to AWeber's marketing homepage, not the developer portal.
 * The real docs live on `api.aweber.com` itself. `labs.aweber.com` — the
 * pre-OAuth2 developer-portal host still referenced by some older
 * integrations — is dead (404) for its old `/docs/reference/1.0` path,
 * though `labs.aweber.com/apps` (the "My Apps" app-registration console)
 * is still live and is where a `client_id`/`client_secret` is minted.
 *
 * ## Three findings that shaped this app, verified live
 *
 *  1. **`PATCH` answers `209`, not `200` or `204`.** Updating a subscriber or
 *     a custom field by ID succeeds with the non-standard HTTP status `209`
 *     and returns the updated entity as the body. `Response.ok` is `true` for
 *     any 2xx status so this is transparent to `fetch`, but code that checks
 *     `res.status === 200` — a natural thing to write — silently treats every
 *     successful update as a failure. `POST` (create a subscriber, a custom
 *     field, or move a subscriber) is the opposite surprise: it succeeds with
 *     `201` and **no body at all**, returning only a `Location` header
 *     pointing at the new resource. See {@link locationId}.
 *  2. **`GET .../tags` returns a bare array of strings** — `["alpha", "beta"]`
 *     — not the `{"entries": [...]}` envelope every other collection in this
 *     API uses. Unwrapping it with {@link AweberClient.list} would silently
 *     produce `undefined`.
 *  3. **Two unrelated error envelopes coexist.** A REST-layer failure (bad
 *     request, not found, forbidden) answers
 *     `{"error": {"type", "message", "status", "documentation_url"}}`. A
 *     bearer-token failure at the resource server answers the RFC 6750 shape
 *     instead: `{"error": "invalid_token", "error_description": "..."}` — a
 *     bare string, not an object. Reading `body.error.message` off the
 *     second shape reads `undefined`. See {@link formatAweberError}.
 *
 * ## Pagination
 *
 * List endpoints page with `ws.start` (offset, default 0) / `ws.size`
 * (page size, default 100, max 100) — not `limit`/`offset` and not a page
 * number. `ws.show=total_size` on the same query re-shapes the response into
 * a bare `{"total_size": N}` rather than a page of entries.
 */

/** The one and only API origin the OpenAPI document declares. */
export const API_BASE = "https://api.aweber.com";

/** Every documented resource path carries this prefix. */
export const API_PREFIX = "/1.0";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/**
 * The `{"entries": [...]}` envelope every collection in this API uses,
 * **except** `GET .../tags` (a bare array — see {@link AweberClient.json}).
 */
export interface AweberCollection<T> {
  entries: T[];
  total_size?: number;
  start?: number;
  next_collection_link?: string;
  prev_collection_link?: string;
  self_link?: string;
  resource_type_link?: string;
}

interface AweberEndpointErrorBody {
  error?: { documentation_url?: string; message?: string; status?: number; type?: string };
}

interface AweberAuthErrorBody {
  error?: string;
  error_description?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive; both are meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Path-escape a caller-supplied resource id (defensive; AWeber ids are numeric). */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Pull the trailing numeric id off a `Location` header.
 *
 * `POST .../subscribers` and `POST .../subscribers/{id}` (move) both succeed
 * with `201` and no response body — the *only* way to learn the new or moved
 * subscriber's id is this header. `POST .../custom_fields` does the same.
 */
export function locationId(location: string | null): number | undefined {
  if (!location) return undefined;
  const match = location.match(/\/(\d+)\/?(?:\?.*)?$/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Turn AWeber's error body into one actionable line.
 *
 * Handles both documented shapes — see the module doc's finding (3). Falls
 * back to the truncated raw body when neither shape parses, which is what a
 * proxy's HTML error page or a network edge case looks like.
 */
export function formatAweberError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (AweberEndpointErrorBody & AweberAuthErrorBody) | null = null;
  try {
    parsed = JSON.parse(raw) as AweberEndpointErrorBody & AweberAuthErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (parsed && typeof parsed.error === "object" && parsed.error) {
    const { type, message } = parsed.error;
    return truncate(
      `AWeber ${status} ${type ?? "error"} for ${method} ${path}${message ? `: ${message}` : ""}`,
    );
  }
  if (parsed && typeof parsed.error === "string") {
    return truncate(
      `AWeber ${status} ${parsed.error} for ${method} ${path}` +
        (parsed.error_description ? `: ${parsed.error_description}` : ""),
    );
  }
  return truncate(`AWeber ${status} for ${method} ${path}: ${raw}`);
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export class AweberClient {
  constructor(private ctx: HookContext) {}

  /**
   * The `{"entries": [...]}` shape most collections use.
   *
   * Not for `GET .../tags`, which answers a bare array — call
   * {@link AweberClient.json} directly for that one endpoint.
   */
  async list<T = unknown>(
    path: string,
    query: Record<string, QueryValue> = {},
  ): Promise<AweberCollection<T>> {
    return await this.json<AweberCollection<T>>(path, { query });
  }

  /** Parse the body as JSON. Returns `undefined` for an empty (e.g. 201) body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** The raw response, for callers that need the `Location` header or the status. */
  async raw(path: string, options: RequestOptions = {}): Promise<Response> {
    return await this.send(path, options);
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
      throw new Error(
        formatAweberError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
