import type { HookContext } from "@w6w/types";

/**
 * Guru API v1 REST client.
 *
 * Everything in this module was verified on 2026-09-05 against Guru's own
 * machine-readable OpenAPI 3 document — served from ReadMe's API registry at
 * `dash.readme.com/api/v1/api-registry/3gy914ims4w0woi` (411,583 bytes,
 * `info.title` "Guru API", `info.version` "v1"), the uuid taken from the
 * `apiRegistries` block embedded in `developer.getguru.com`'s own page data —
 * plus live probes against `api.getguru.com`. Nothing came from a third-party
 * integration directory.
 *
 * ## One host, one prefix, no envelope
 *
 * The OpenAPI document declares exactly one server, `https://api.getguru.com/`,
 * and every path carries the `/api/v1` prefix. Unlike many REST APIs in this
 * pack, list and search endpoints return a **bare JSON array** — there is no
 * `{"data": [...]}` or `{"items": [...]}` envelope anywhere in this surface.
 *
 * ## Pagination is a `Link` header, not a body cursor
 *
 * Every list/search endpoint's own description says the same thing: "A maximum
 * of N results will be returned. If more exist, a link to the next page of
 * results will be included in the Link header." That is the RFC 5988 form
 * (`Link: <https://api.getguru.com/api/v1/...&token=xyz>; rel="next"`), and the
 * `token` query parameter it carries is what every list/search action here
 * accepts to continue. {@link extractNextToken} pulls it out so an action never
 * has to hand a caller a raw header to parse.
 *
 * ## Errors carry no JSON body
 *
 * Every documented error response (400/401/403/404) declares `"content": {}` —
 * no schema — and that was confirmed live on 2026-09-05: an unauthenticated
 * `GET /api/v1/whoami` and a request signed with a syntactically plausible but
 * fake `user:token` pair both answer a bare `401` with `content-length: 0`.
 * There is no vendor error code to surface, unlike Apify or Aircall in this
 * same pack — {@link formatGuruError} therefore reports the HTTP status and
 * whatever text the response carries (usually nothing) rather than pretending
 * a structured error type exists.
 *
 * ## Ordinary reads can carry a live Collection token
 *
 * Guru's `CollectionModel` schema — embedded as `.collection` on every `Card`
 * and `Folder`, and returned directly by every collection endpoint — declares
 * a bare, undocumented `token: string` property, and `TeamUser` (what
 * `GET /api/v1/members` returns) declares the same. Neither field carries a
 * schema description ruling out that it is the Collection's own read-only API
 * token (see `auth/basic.ts` for what that token can do). This app has no live
 * Collection-token credential to confirm the field's contents one way or the
 * other, and a workflow step's result is persisted and re-rendered downstream
 * — exactly the situation `REDACTED_FIELDS` handles for Apify elsewhere in
 * this pack — so {@link stripTokens} deletes `token` from an entity and from
 * its embedded `collection`, unconditionally, before any action returns it.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.getguru.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers, merged after the default `accept`. */
  headers?: Record<string, string>;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `showArchived=false` and `maxResults=0` are both
 * meaningful, and silently dropping them would make them impossible to
 * express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`-shaped param into a plain string list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Pull the `rel="next"` URL's `token` query parameter out of a `Link` response
 * header (RFC 5988: `<url>; rel="next", <url>; rel="prev"`).
 *
 * Returns `undefined` when there is no next page — the caller's own signal
 * that a list/search loop is done — rather than an empty string, which would
 * be sent back as a real (and wrong) paging token.
 */
export function extractNextToken(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
    if (!match) continue;
    try {
      const token = new URL(match[1]).searchParams.get("token");
      if (token) return token;
    } catch {
      // Not a parseable absolute URL — ignore rather than throw over a header
      // this app does not control.
    }
  }
  return undefined;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a failed Guru response into one actionable line.
 *
 * See the module doc for why there is no vendor error `type`/`code` to
 * surface: every documented 4xx response body is empty, and that was
 * confirmed on the wire.
 */
export function formatGuruError(status: number, method: string, path: string, raw: string): string {
  const hint = status === 401
    ? " (missing or invalid Basic credentials)"
    : status === 403
    ? " (a Collection token is read-only and cannot make this request, or the credential lacks access)"
    : status === 404
    ? " (no such resource, or the credential cannot see it)"
    : "";
  const body = raw ? `: ${truncate(raw)}` : "";
  return `Guru ${status} for ${method} ${path}${hint}${body}`;
}

/**
 * Remove a possibly-live Collection token from an entity, returning a shallow
 * copy. See the module doc for why this exists.
 *
 * Deliberately narrow — exactly `token` at the top level and one level down
 * inside `collection`, never a heuristic scan for anything "looking secret" —
 * because a scan broad enough to catch a renamed field would also be broad
 * enough to eat a user's own Card content that happens to mention the word.
 */
export function stripTokens<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out.token;
  const collection = out.collection;
  if (collection && typeof collection === "object" && !Array.isArray(collection)) {
    const copy: Record<string, unknown> = { ...(collection as Record<string, unknown>) };
    delete copy.token;
    out.collection = copy;
  }
  return out as T;
}

export class GuruClient {
  constructor(private ctx: HookContext) {}

  /** Parse the body as JSON. `204`/empty bodies resolve to `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for endpoints (verify, delete) that answer with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  /** `json`, plus the `token` for the next page pulled from the `Link` header. */
  async page<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ items: T[]; nextToken?: string }> {
    const res = await this.send(path, options);
    const nextToken = extractNextToken(res.headers.get("link"));
    const text = await res.text();
    const items = text ? (JSON.parse(text) as T[]) : [];
    return { items, nextToken };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      ...options.headers,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatGuruError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
