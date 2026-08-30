import type { HookContext } from "@w6w/types";

/**
 * VideoAsk REST client (`api.videoask.com`).
 *
 * Everything in this module was verified on 2026-08-30 against the vendor's own
 * Postman collection — fetched as raw JSON from
 * `documenter.gw.postman.com/api/collections/291373/SWTEdwrG` (the documenter
 * page at https://documenter.getpostman.com/view/291373/SWTEdwrG embeds that
 * URL as its own data source) — plus live, unauthenticated probes against
 * `api.videoask.com` on the same day. Nothing here came from a third-party
 * integration directory.
 *
 * ## One host, no version prefix
 *
 * The collection declares exactly one server, `https://api.videoask.com`, and
 * every documented path hangs directly off it — there is no `/v1` or `/v2`
 * segment anywhere in the 45+ endpoints this app was checked against.
 *
 * ## Two response shapes, and the discrepancy is deliberate to preserve
 *
 * Most endpoints return the entity itself (a form, a question, a tag, …) with
 * no envelope. **List** endpoints wrap it: `{results: [...], next, previous}`,
 * with `count` present on some (forms, tags, conversations) and absent on
 * others. One exception breaks that rule outright —
 * `GET /questions/{id}/answers` accepts `limit`/`offset` exactly like the
 * enveloped lists but answers a **bare JSON array**, confirmed against the
 * vendor's own example response. Getting that one wrong throws a runtime type
 * error rather than silently returning nothing, which is why {@link list} and
 * {@link array} are kept as two separate helpers instead of one that guesses.
 *
 * ## Errors
 *
 * Confirmed live: an unauthenticated request answers
 * `401 {"detail": "Authentication credentials were not provided."}`, and a
 * syntactically-invalid bearer token answers `401 {"detail": "Error decoding
 * token."}`. Validation failures follow Django REST Framework's usual shape —
 * `{"<field>": ["<message>", ...]}` — so {@link formatVideoAskError} handles
 * both a `detail` string and a field-keyed object rather than assuming one.
 *
 * ## `organization-id`
 *
 * Documented as an **optional** header most endpoints accept: "allow[s]
 * accessing resources from different organizations where you also have proper
 * permissions." Every action in this app exposes it as an optional
 * `organizationId` param rather than baking one organization into the
 * Connection, because a caller may legitimately belong to several.
 *
 * ## No rate-limit headers
 *
 * A live unauthenticated probe against `GET /forms` on 2026-08-30 carried no
 * `x-ratelimit-*`, `retry-after`, or similar header on its 401 response, and
 * the vendor's Postman collection documents none either. See
 * `health/request-rate.ts` for what that means for headroom reporting.
 */

/** The one and only API origin. The collection declares no other server. */
export const API_BASE = "https://api.videoask.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Optional `organization-id` header — see the module doc. */
  organizationId?: string;
}

/** The `{results, next, previous, count?}` envelope every list endpoint but one uses. */
export interface VideoAskListPage<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

interface VideoAskErrorBody {
  detail?: string;
  [field: string]: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect` param into an array, accepting a comma-separated string too. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Path-escape a caller-supplied resource id (form/question/contact/tag/… id). */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable — a validation body can carry many fields. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn VideoAsk's error body into one actionable line.
 *
 * `detail` covers auth and not-found failures; a bare field-keyed object
 * covers DRF-style validation errors on create/update. Both are surfaced
 * verbatim because the fix differs (reconnect vs. fix the input) and a
 * flattened "HTTP 400" hides which one happened.
 */
export function formatVideoAskError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: VideoAskErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as VideoAskErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed) return `VideoAsk ${status} for ${method} ${path}: ${truncate(raw)}`;
  if (typeof parsed.detail === "string") {
    return `VideoAsk ${status} for ${method} ${path}: ${parsed.detail}`;
  }

  const fields = Object.entries(parsed)
    .map(([field, messages]) =>
      `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`
    )
    .join("; ");
  return truncate(
    fields
      ? `VideoAsk ${status} for ${method} ${path}: ${fields}`
      : `VideoAsk ${status} for ${method} ${path}: ${truncate(raw)}`,
    1000,
  );
}

export class VideoAskClient {
  constructor(private ctx: HookContext) {}

  /** An un-enveloped entity — the shape most endpoints answer with. */
  async entity<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return await this.json<T>(path, options);
  }

  /** The `{results, next, previous, count?}` envelope. */
  async list<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<VideoAskListPage<T>> {
    return await this.json<VideoAskListPage<T>>(path, options);
  }

  /**
   * A bare JSON array response.
   *
   * Only `GET /questions/{id}/answers` uses this shape today — see the module
   * doc for why it is kept separate from {@link list} rather than merged.
   */
  async array<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    return await this.json<T[]>(path, options);
  }

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for DELETE endpoints that answer 204 with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.organizationId) headers["organization-id"] = options.organizationId;
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatVideoAskError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
