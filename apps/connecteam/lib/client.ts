import type { HookContext } from "@w6w/types";

/**
 * Connecteam API v1 REST client (`api.connecteam.com`).
 *
 * Verified on 2026-08-29 against Connecteam's own machine-readable OpenAPI 3.1
 * document, discovered via its RFC 9727 API-catalog well-known file rather than
 * guessed: `developer.connecteam.com/.well-known/api-catalog` links
 * `https://developer.connecteam.com/openapi/connecteam-api-documentation.json`
 * (616,945 bytes, `info.version` `"v1"`), plus live probes against
 * `api.connecteam.com` the same day. Nothing here came from a third-party
 * integration directory.
 *
 * ## Envelope
 *
 * Every response is `{"requestId": "...", "data": {...}}`; a paginated list
 * additionally carries `"paging": {"offset": N, "total"?: N}` — `total` is
 * only populated by endpoints that compute it, so it is optional even where
 * present in the schema. {@link ConnecteamClient.data} unwraps the single-object
 * form; {@link ConnecteamClient.page} keeps `paging` alongside the unwrapped data
 * for endpoints a caller needs to page through.
 *
 * ## Two error shapes, not one — verified live, not from the OpenAPI document
 *
 * The OpenAPI document only declares `200` and a FastAPI `422` validation
 * error (`{"detail": [{"loc", "msg", "type"}, ...]}`). Live probes against
 * `api.connecteam.com` on 2026-08-29 found two more, and they are NOT the same
 * shape:
 *
 *  - **No credential at all** — `GET /me` with no `X-API-KEY` header answers
 *    `401` with `{"details": null, "error": "No authentication provided",
 *    "path": "/me", "request_id": "..."}`. Note `error` (singular) and
 *    `details` (plural), the opposite of the shape below.
 *  - **A credential that doesn't match a company** — the same call with a
 *    syntactically plausible but wrong key answers `403` with
 *    `{"detail": "Invalid API key"}`. Note `detail` (singular), FastAPI's
 *    generic exception shape, colliding in spelling but not in structure with
 *    the 422 body's `detail` (which is an *array*).
 *
 * {@link formatConnecteamError} reads all three shapes rather than assuming
 * one, because guessing wrong here silently swallows the vendor's own
 * diagnostic and reports a bare status code instead.
 *
 * ## Pagination
 *
 * Offset/limit query parameters (`limit`, `offset`), same on every list
 * endpoint in this app's surface. Vendor defaults are modest (10) compared to
 * Apify-style APIs, and per-endpoint ceilings vary (300–500) — each action
 * states its own ceiling rather than a pack-wide constant, because a wrong
 * shared number either silently truncates a caller's stated limit or gets
 * rejected as invalid by an endpoint with a lower one.
 *
 * ## Array query parameters
 *
 * OpenAPI 3.1 states no `style`/`explode` for any array query parameter here,
 * so the specification's own default applies: `form` style, `explode: true` —
 * a repeated key (`userIds=1&userIds=2`), not a single comma-joined value.
 * This is also what FastAPI (the framework `HTTPValidationError`'s shape
 * gives away) does for a `List[int] = Query(None)` parameter. Getting this
 * wrong is invisible in a quick test — Connecteam does not reject a
 * comma-joined string, it just silently treats it as one filter value that
 * matches nothing.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.connecteam.com";

export type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

export interface ConnecteamPaging {
  offset: number;
  /** Only populated by endpoints that compute a total count. */
  total?: number;
}

interface ValidationErrorItem {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

/** The shape a bare `{"detail": "..."}` or 422 `{"detail": [...]}` body takes. */
interface DetailErrorBody {
  detail?: string | ValidationErrorItem[];
}

/** The shape the "no credential reached the request" 401 takes. */
interface NoAuthErrorBody {
  error?: string;
  details?: unknown;
  path?: string;
  request_id?: string;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — both are
 * meaningful values (`isApproved=false`, `offset=0`) and silently dropping
 * them would make them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Normalise a `multiselect`/free-text param into a list of trimmed, non-empty
 * strings — accepting either a real array (from a `multiselect` param) or a
 * comma-separated string (a `string` param a caller typed by hand).
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Same, but each element must be a positive integer (a list of user/entity ids). */
export function toIdList(v: unknown): number[] | undefined {
  const list = toList(Array.isArray(v) ? v.map(String) : (v as string | undefined));
  if (!list) return undefined;
  const nums = list.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? nums : undefined;
}

/** Keep an error message readable — a validation body can carry several items. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn one of Connecteam's three documented-or-observed error shapes into one
 * actionable line. See the module docs for why there are three, not one.
 */
export function formatConnecteamError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }

  if (parsed && typeof parsed === "object") {
    const asDetail = parsed as DetailErrorBody;
    if (typeof asDetail.detail === "string") {
      return `Connecteam ${status} for ${method} ${path}: ${asDetail.detail}`;
    }
    if (Array.isArray(asDetail.detail)) {
      const items = asDetail.detail
        .map((d) => `${(d.loc ?? []).join(".") || "body"}: ${d.msg ?? "invalid"}`)
        .join("; ");
      return `Connecteam ${status} validation error for ${method} ${path}: ${truncate(items)}`;
    }
    const asNoAuth = parsed as NoAuthErrorBody;
    if (typeof asNoAuth.error === "string") {
      return `Connecteam ${status} for ${method} ${path}: ${asNoAuth.error}`;
    }
  }
  return `Connecteam ${status} for ${method} ${path}: ${truncate(raw)}`;
}

export class ConnecteamClient {
  constructor(private ctx: HookContext) {}

  /** `{"requestId", "data": …}` in, `data` out. The shape of every single-object endpoint. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** Same, but keeps the `paging` envelope alongside the unwrapped data — for list endpoints. */
  async page<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ data: T; paging: ConnecteamPaging }> {
    const body = await this.json<{ data?: T; paging?: ConnecteamPaging }>(path, options);
    return {
      data: (body?.data ?? body) as T,
      paging: body?.paging ?? { offset: 0 },
    };
  }

  /** Parse the body without unwrapping — for the rare endpoint with no `data` envelope. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer with no body worth reading. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // `form` style, `explode: true` — the OpenAPI 3.1 default this
        // document relies on for every array query parameter. See module docs.
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
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
        formatConnecteamError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
