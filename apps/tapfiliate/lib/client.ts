import type { HookContext } from "@w6w/types";

/**
 * Tapfiliate REST API v1.6 client (`api.tapfiliate.com`).
 *
 * ## Where the real docs live
 *
 * The Apiary blueprint this app's build brief pointed at
 * (`https://tapfiliate.docs.apiary.io/`) is a 144-byte stub: "Our docs have
 * moved" to `https://tapfiliate.com/docs/rest/`. That page is itself a
 * client-looking single-page app, but unlike most vendor doc sites it is
 * SERVER-RENDERED — the full reference (every endpoint, URI parameter,
 * request argument and example request/response) is present in the initial
 * HTML, just wrapped in the site's own layout chrome. Fetched and parsed on
 * 2026-09-05.
 *
 * Every path, method, query parameter and body field in this app was read off
 * that rendered page, cross-checked in the "Code Example" cURL/Node snippets
 * (which occasionally carry a field the prose "Arguments" list omits — see
 * `auth/api-key.ts` for the sharpest case), and then verified live against
 * `api.tapfiliate.com` on the same day.
 *
 * ## Version and host
 *
 * One host, `https://api.tapfiliate.com`, one version prefix, `/1.6` — the
 * docs state "The current version of the API is V1.6" and every example URL
 * carries it. There is no sandbox/test host.
 *
 * ## No response envelope
 *
 * Unlike some vendors (Apify wraps everything in `{"data": …}`), Tapfiliate
 * returns the resource directly: an object for a single-item endpoint, a bare
 * JSON array for a collection. There is nothing to unwrap.
 *
 * ## Two different "boolean" encodings in the same API
 *
 * Most boolean query parameters are the literal strings `true`/`false`
 * (`recalculate_commissions=false`, `pending=false`, `use_profile_timezone=false`,
 * `override_max_cookie_time=false`). But `GET /commissions/`'s `paid` filter is
 * documented as `Valid values are: 1 | 0` — the same semantic, a different
 * wire format. Sending `paid=false` to that one endpoint is therefore
 * undocumented behaviour, so {@link boolStr} and {@link flagStr} are kept
 * distinct rather than one "boolean to string" helper.
 *
 * ## Errors: a JSON body needs a NON-EMPTY credential header first
 *
 * `formatTapfiliateError` exists because Tapfiliate's error surface is not
 * one shape. Measured live on 2026-09-05 against `GET /1.6/programs/`:
 *
 *  - **A syntactically-present, non-empty `X-Api-Key` that is simply wrong**
 *    gets a clean, parseable JSON body: `{"message":"Authentication Failed.","code":401}`.
 *  - **No `X-Api-Key` header at all, OR one present with an empty string
 *    value,** gets `text/html` — the web app's own "Unauthorized" login-wall
 *    page (a full HTML document with its own JS bundle, cookie banner, etc).
 *  - **An unmapped/typo'd path** (still with a non-empty bogus key) also gets
 *    `text/html` — the web app's "Page not found" page, not a JSON 404. Route
 *    matching happens ahead of, or independent from, the REST API's own error
 *    handling.
 *
 * A client that assumes every error body is JSON will throw a confusing
 * "Unexpected token '<'" instead of a useful message the moment either of the
 * last two cases fires — which happens for the exact bug (a missing
 * credential, or a code typo in a path) that most needs a clear message. This
 * client checks the response `content-type` and falls back to a truncated
 * text excerpt with an explicit note when it is not JSON.
 */

/** The one and only API origin. */
export const API_BASE = "https://api.tapfiliate.com";

/** Every documented path carries this version prefix. */
export const API_PREFIX = "/1.6";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** A Tapfiliate collection response: a bare array plus optional `Link`-header paging. */
export interface TapfiliatePage<T> {
  items: T[];
  /** Present only when the `Link` response header carries a `rel="next"` entry with a `page` value. */
  nextPage?: number;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — `paid=0` and
 * `override_max_cookie_time=false` are both meaningful values, not absence.
 *
 * Generic over its input so the result stays assignable to whatever narrower
 * shape the caller declared (e.g. `Record<string, QueryValue>` for a query
 * object) rather than widening everything to `Record<string, unknown>`.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/** Render a boolean the way most of this API's query parameters document it: the literal word. */
export function boolStr(v: boolean | undefined): string | undefined {
  return v === undefined ? undefined : v ? "true" : "false";
}

/**
 * Render a boolean the way `GET /commissions/`'s `paid` filter documents it —
 * `1` or `0`, not `true`/`false`. See the module doc for why this is not the
 * same helper as {@link boolStr}.
 */
export function flagStr(v: boolean | undefined): string | undefined {
  return v === undefined ? undefined : v ? "1" : "0";
}

/** Path-escape a caller-supplied resource id. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable — an HTML error page can be enormous. */
export function truncate(text: string, max = 300): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

interface TapfiliateErrorBody {
  message?: string;
  code?: number;
}

/**
 * Turn a failed response into one actionable line. See the module doc for why
 * this cannot assume the body is JSON.
 */
export function formatTapfiliateError(
  status: number,
  method: string,
  path: string,
  contentType: string,
  raw: string,
): string {
  const isJson = contentType.toLowerCase().includes("json");
  if (isJson) {
    try {
      const body = JSON.parse(raw) as TapfiliateErrorBody;
      if (body && typeof body.message === "string") {
        const rateNote = status === 429
          ? " — rate-limited; back off and retry (see X-Ratelimit-Reset)"
          : "";
        return `Tapfiliate ${status} for ${method} ${path}: ${body.message}${rateNote}`;
      }
    } catch { /* fall through to the generic message below */ }
  }
  return `Tapfiliate ${status} for ${method} ${path}: non-JSON response (${
    contentType || "no content-type"
  }) — likely a missing/empty credential or an unmapped path, both of which Tapfiliate answers ` +
    `with its web app's own HTML page rather than a JSON API error. First bytes: ${truncate(raw)}`;
}

/** Parse an RFC 5988 `Link` header into `rel -> url`. */
export function parseLinkHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(",")) {
    const match = part.trim().match(/^<([^>]+)>\s*;\s*rel="([^"]+)"$/);
    if (match) out[match[2]] = match[1];
  }
  return out;
}

/** Read the `page` query parameter off a `Link` header URL, if present. */
export function nextPageOf(linkHeader: string | null): number | undefined {
  const url = parseLinkHeader(linkHeader).next;
  if (!url) return undefined;
  const page = Number(new URL(url).searchParams.get("page"));
  return Number.isFinite(page) && page > 0 ? page : undefined;
}

export class TapfiliateClient {
  constructor(private ctx: HookContext) {}

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
        formatTapfiliateError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          res.headers.get("content-type") ?? "",
          detail,
        ),
      );
    }
    return res;
  }

  /** A single-resource endpoint. Returns `undefined` for a 204 or empty body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A collection endpoint. Tapfiliate returns a bare array (no envelope) and
   * carries pagination in the `Link` response header rather than the body —
   * see the "Pagination" section of the docs: 25 items per page by default,
   * further pages via `?page=`.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<TapfiliatePage<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    const items = text ? (JSON.parse(text) as T[]) : [];
    return { items, nextPage: nextPageOf(res.headers.get("link")) };
  }

  /** Status only — used by an action that only cares whether the call succeeded. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }
}
