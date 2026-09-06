import type { HookContext } from "@w6w/types";

/**
 * Livestorm Public API v1 client (`api.livestorm.co/v1`).
 *
 * Every path, verb, query parameter, request/response field and header in this app was
 * verified 2026-09-06 against the vendor's own OpenAPI 3.0.3 document — embedded server-side
 * as `document.api.schema` in the page data ReadMe serves for
 * `https://developers.livestorm.co/reference/*` (a live ReadMe-hosted developer portal, not a
 * third-party integration directory) — plus live, unauthenticated and garbage-credential
 * probes against `api.livestorm.co`.
 *
 * ## Auth: the header must NOT carry a `Bearer ` prefix
 *
 * The OpenAPI document declares two security schemes: `api_key` (`type: apiKey`, `in: header`,
 * `name: Authorization` — the private token) and `oauth2` (`type: oauth2`, Doorkeeper-backed).
 * Both schemes read the *same* `Authorization` header, and which code path handles a request is
 * decided by whether the value looks like a bearer token:
 *
 * ```
 * GET /v1/ping  Authorization: sometoken123        -> 401 {"errors":[{"status":"unauthorized",...}]}
 * GET /v1/ping  Authorization: Bearer sometoken123  -> 401, www-authenticate: Bearer realm="Doorkeeper",
 *                                                       error="invalid_token" — the OAUTH2 code path
 * ```
 * (both measured live 2026-09-06, garbage credential, `api.livestorm.co`). A private API token
 * sent as `Authorization: Bearer <token>` is therefore checked against the OAuth2
 * (Doorkeeper) token store instead of the API-key store and is rejected even when the token
 * itself is fine. This app's `sign` hook sends the raw token with no prefix — see
 * `auth/api-key.ts`.
 *
 * ## Response envelope: JSON:API (`application/vnd.api+json`)
 *
 * Every 2xx body is `{"data": ...}`; a list additionally carries
 * `{"meta": {current_page, previous_page, next_page, record_count, page_count, items_per_page}}`
 * (`current_page` is 0-indexed, confirmed by the vendor's own `GET /events` example). Every
 * error body is `{"errors": [{"title", "detail", "code", "status"}]}` — `status` is the
 * vendor's own machine-readable code (`"unauthorized"`, …), read here in preference to the bare
 * HTTP status per this pack's convention.
 *
 * ## Pagination and filtering
 *
 * Every list endpoint takes `page[number]` (0-indexed) and `page[size]`, plus zero or more
 * `filter[<name>]` query parameters specific to that resource, and some accept `include` (a
 * JSON:API relationship-inclusion list, sent as one comma-joined value).
 *
 * ## Write bodies are JSON:API resource objects
 *
 * Every create/update body is `{"data": {"type": "<resource-type>", "attributes": {...}}}`,
 * occasionally with a sibling `relationships` object (event-session creation can attach
 * people). `buildBody()` assembles this shape.
 *
 * ## Registration attributes are a dynamic `fields` array, not top-level keys
 *
 * Registering or updating a session participant does NOT take `email`/`first_name` as ordinary
 * attributes — it takes `attributes.fields: [{id: "email", value: "..."}, ...]`, where `id` is
 * a People Attribute slug (built-in: `email`, `first_name`, `last_name`, …, or a custom
 * attribute created in the workspace, listable via `GET /people_attributes`). Sending
 * `attributes.email` directly is silently ignored by the schema.
 *
 * ## Rate limits: two windows, read from headers on every response
 *
 * A monthly budget and a 1-second interval budget are reported on every successful response
 * (`RateLimit-Monthly-{Limit,Remaining}`, `RateLimit-Interval-{Limit,Remaining}`); a `429`
 * additionally carries `Retry-After` and `RateLimit-Reset` (a Unix timestamp). See
 * `health/quota.ts`.
 *
 * ## A vendor documentation bug worth knowing about
 *
 * `GET /me`'s documented response schema AND example both describe an `organizations` resource
 * (`name`/`slug`/`parent_id`) — identical to `GET /organization`'s, not a person/user shape.
 * This looks like a copy-paste error in the vendor's own spec rather than the real wire shape,
 * so `auth/api-key.ts`'s `afterConnect` reads the organization name from `GET /organization`
 * (unambiguously about the organization) rather than trusting `/me`'s documented shape. The
 * `me-get` Action still calls `GET /me` and returns whatever the vendor actually sends, since an
 * Action passes through live data rather than guessing at a corrected schema.
 */

export const API_HOST = "api.livestorm.co";
export const API_BASE = `https://${API_HOST}/v1`;

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface JsonApiResource<A = Record<string, unknown>> {
  id: string;
  type: string;
  attributes?: A;
  relationships?: Record<string, unknown>;
}

export interface JsonApiMeta {
  current_page?: number;
  previous_page?: number | null;
  next_page?: number | null;
  record_count?: number;
  page_count?: number;
  items_per_page?: number;
}

export interface JsonApiListResponse<A = Record<string, unknown>> {
  data: JsonApiResource<A>[];
  meta?: JsonApiMeta;
  included?: JsonApiResource[];
}

export interface JsonApiSingleResponse<A = Record<string, unknown>> {
  data: JsonApiResource<A>;
  included?: JsonApiResource[];
}

interface JsonApiErrorBody {
  errors?: Array<{ title?: string; detail?: string; code?: string; status?: string }>;
}

/**
 * Drop keys the caller left unset, so an update body doesn't null out untouched fields.
 *
 * Generic over the input shape (rather than widening to `Record<string, unknown>`) so the
 * result stays assignable to a narrower target — e.g. spreading it into a `RequestOptions.query`
 * object typed `Record<string, QueryValue>`.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out = {} as Partial<T>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** JSON:API relationship-inclusion / multi-value query lists are one comma-joined value. */
export function toList(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/**
 * One `{id, value}` People Attribute entry — the shape every write to a session
 * participant's data uses instead of top-level attribute keys. See the module doc.
 */
export interface PersonField {
  id: string;
  value: string;
}

/**
 * Accept either an already-built `PersonField[]` or a flat `Record<slug, value>` (the more
 * convenient shape for an editor form) and normalise to the array the API expects.
 */
export function toPersonFields(
  fields: PersonField[] | Record<string, string> | undefined,
): PersonField[] | undefined {
  if (fields === undefined || fields === null) return undefined;
  if (Array.isArray(fields)) return fields.filter((f) => f && f.id);
  const out = Object.entries(fields)
    .filter(([k, v]) => k && v !== undefined && v !== null && v !== "")
    .map(([id, value]) => ({ id, value: String(value) }));
  return out.length ? out : undefined;
}

/** Assemble a JSON:API write body: `{"data": {"type", "attributes", "relationships"?}}`. */
export function buildBody(
  type: string,
  attributes?: Record<string, unknown>,
  relationships?: Record<string, unknown>,
): { data: Record<string, unknown> } {
  const data: Record<string, unknown> = { type };
  if (attributes && Object.keys(attributes).length > 0) data.attributes = attributes;
  if (relationships && Object.keys(relationships).length > 0) data.relationships = relationships;
  return { data };
}

/** Shared list-query shape every list Action's `params` accepts. */
export interface ListQuery {
  pageNumber?: number;
  pageSize?: number;
  include?: string[] | string;
}

/** Turn the shared `ListQuery` fields into `page[number]`/`page[size]`/`include` query entries. */
export function listQuery(q: ListQuery): Record<string, QueryValue> {
  return compact({
    "page[number]": q.pageNumber,
    "page[size]": q.pageSize,
    "include": toList(q.include),
  }) as Record<string, QueryValue>;
}

/**
 * Turn Livestorm's JSON:API error envelope into one actionable line.
 *
 * `errors[0].status` is the vendor's own machine-readable code (`"unauthorized"`, …) — kept
 * because it is what this pack's health/auth probes classify on, in preference to the bare
 * HTTP status a flattened message would otherwise hide.
 */
export function formatLivestormError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: JsonApiErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as JsonApiErrorBody;
  } catch {
    // not JSON — fall through to the raw body
  }
  const err = parsed?.errors?.[0];
  if (!err) return `Livestorm ${status} for ${method} ${path}: ${raw.slice(0, 500)}`;
  const parts = [
    `Livestorm ${status}${err.status ? ` ${err.status}` : ""} for ${method} ${path}`,
    err.title,
    err.detail,
  ].filter(Boolean);
  return parts.join(": ");
}

export class LivestormClient {
  constructor(private ctx: HookContext) {}

  /** Parses and returns the JSON body (or `undefined` for a 204/empty response). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for actions (delete) that only care whether it succeeded. */
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

    const headers: Record<string, string> = { accept: "application/vnd.api+json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/vnd.api+json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLivestormError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
