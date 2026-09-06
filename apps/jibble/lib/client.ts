import type { HookContext } from "@w6w/types";

/**
 * Jibble REST API client.
 *
 * Everything here was verified on 2026-09-06 against Jibble's own public Postman
 * collection, rendered at `docs.api.jibble.io` (a Postman-documenter page backed by
 * collection id `11516962-9900ee92-5a41-4f67-9bfa-005dcc0c3d7b`), fetched as raw JSON via
 * the documenter's own `/api/collections/...` endpoint rather than scraped from HTML. No
 * detail here came from a third-party integration directory.
 *
 * ## Five hosts, one credential — Jibble is a microservice-per-domain API
 *
 * There is no single `api.jibble.io`. The collection addresses five distinct hosts, each
 * fronting one service:
 *
 *   - `identity.prod.jibble.io` — the OAuth2 token endpoint only.
 *   - `workspace.prod.jibble.io` — organization, people, positions, locations, kiosks,
 *     schedules, activities, projects, clients, groups, time-off policies, calendars.
 *   - `time-tracking.prod.jibble.io` — time entries, hour entries, screenshots, time-off
 *     requests, leave balances, pay-period status changes.
 *   - `time-attendance.prod.jibble.io` — timesheets and the tracked-time/attendance reports.
 *   - `authorization.prod.jibble.io` — roles and role assignment (not covered by this app;
 *     see the README for what's in and out of scope).
 *
 * One `client_credentials` token is valid across all of them — the collection's own
 * `Get Access Token` folder mints it once and every other request reuses it as a bearer
 * token — so `sign` stamps the same header regardless of which host an action targets.
 *
 * ## The whole API is OData v1 — and pagination is manual, not a `nextLink`
 *
 * Every list endpoint answers `{"@odata.context": "...", "@odata.count": N, "value": [...]}`
 * and reads the standard OData query keywords: `$select`, `$filter`, `$expand`, `$orderby`,
 * `$top`, `$skip`, `$count`. There is **no** `@odata.nextLink` anywhere in the collection —
 * paging forward means the caller tracks `$skip` itself and stops when `value.length` is
 * smaller than the `$top` it asked for, or when `$count`'s total has been reached. Getting
 * this wrong (assuming a follow-up link exists) silently truncates a report at whatever the
 * default page size turns out to be.
 *
 * ## Two addressing styles coexist for "one resource by id" — and it isn't the id shape that
 * decides which one applies
 *
 * Most singular reads/writes address a resource OData-style, with the id in parentheses
 * appended directly to the collection name and NO surrounding quotes even though the id is a
 * GUID (`People(558b5111-31a0-423c-8ea1-1f5a0d20faba)`, `Locations(id)`,
 * `TimeOffIntervals(id)`). But `PATCH /v1/TimeEntries/{id}` (Update / soft-delete a time
 * entry) uses an ordinary path segment instead. Building every id-addressed URL through the
 * same OData-parenthesis helper would silently 404 on that one endpoint family.
 *
 * ## "Delete Time Entry" does not delete anything
 *
 * The collection's own "Delete Time Entry" request is `PATCH /v1/TimeEntries/{id}` with body
 * `{"status": "Archived"}` — a soft-delete via status flip, not an HTTP `DELETE`. Contrast
 * with `DELETE /v1/People({id})` ("Delete member completely"), which really is a hard delete.
 * Two different resources, two different deletion semantics, same-looking vendor label.
 *
 * ## Errors: `{"error": {"code", "message", "innererror": {...}}}`
 *
 * Observed on a live 402 (`Add New Client` against a plan without the Clients entity
 * enabled): `error.code` is a stable machine string (`feature_restricted_subscription`), and
 * `error.innererror.trace` is a raw .NET stack trace that must never be surfaced to a
 * workflow. Only `code` and `message` are used here.
 */

export const IDENTITY_HOST = "https://identity.prod.jibble.io";
export const WORKSPACE_HOST = "https://workspace.prod.jibble.io";
export const TIME_TRACKING_HOST = "https://time-tracking.prod.jibble.io";
export const TIME_ATTENDANCE_HOST = "https://time-attendance.prod.jibble.io";

/** The client-credentials token endpoint, form-urlencoded, per the collection's own example. */
export const TOKEN_URL = `${IDENTITY_HOST}/connect/token`;

/** OData query keywords a list action may set, in the app's own camelCase spelling. */
export interface ODataQuery {
  select?: string;
  filter?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

export interface ODataPage<T> {
  items: T[];
  /** Set only when the action asked for `count: true`. */
  count?: number;
}

interface ODataListBody<T> {
  "@odata.count"?: number;
  value?: T[];
}

interface JibbleErrorBody {
  error?: { code?: string; message?: string };
}

export interface RequestOptions {
  method?: string;
  /**
   * A `string[]` value is sent as a REPEATED query key (`?personIds=a&personIds=b`) — the
   * form `TrackedTimeReport`'s multi-value filters (`personIds`, `projectIds`, ...) document.
   */
  query?: Record<string, string | number | boolean | string[] | undefined>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Translate {@link ODataQuery} into the `$`-prefixed keys Jibble reads on the wire. */
export function odataParams(q: ODataQuery = {}): Record<string, string> {
  const out: Record<string, string> = {};
  if (q.select) out["$select"] = q.select;
  if (q.filter) out["$filter"] = q.filter;
  if (q.expand) out["$expand"] = q.expand;
  if (q.orderBy) out["$orderby"] = q.orderBy;
  if (typeof q.top === "number") out["$top"] = String(q.top);
  if (typeof q.skip === "number") out["$skip"] = String(q.skip);
  if (q.count) out["$count"] = "true";
  return out;
}

/**
 * Address one resource OData-style: `Resource(id)`, unquoted even for a GUID key — this is
 * what every `People`/`Locations`/`Activities`/`Projects`/`Clients`/`Groups`/`TimeOffIntervals`
 * singular request does. Do NOT use this for `TimeEntries/{id}`, which is a plain path segment.
 */
export function entityPath(resource: string, id: string): string {
  return `/v1/${resource}(${encodeURIComponent(String(id ?? "").trim())})`;
}

/** Normalise a `repeat`-able string param into a list, whether it arrived as an array or CSV. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a `.NET` trace can run to thousands of characters. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Jibble's error envelope into one actionable line. `innererror.trace` (a raw stack
 * trace, observed on a live 402) is deliberately never included.
 */
export function formatJibbleError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: JibbleErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as JibbleErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Jibble ${status} for ${method} ${path}: ${truncate(raw)}`;
  return truncate(
    `Jibble ${status} ${err.code ?? "error"} for ${method} ${path}: ${err.message ?? "no message"}`,
    800,
  );
}

export class JibbleClient {
  constructor(private ctx: HookContext) {}

  /** `GET` a list endpoint and unwrap its `{"@odata.count", "value": [...]}` envelope. */
  async list<T = unknown>(host: string, path: string, query?: ODataQuery): Promise<ODataPage<T>> {
    const body = await this.json<ODataListBody<T>>(host, path, { query: odataParams(query) });
    return { items: body?.value ?? [], count: body?.["@odata.count"] };
  }

  /** Parse the JSON body of a non-list response. Returns `undefined` for a 204. */
  async json<T = unknown>(host: string, path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(host, path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for the `PATCH`/`DELETE` endpoints that answer 200/204 with no body. */
  async status(host: string, path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(host, path, options);
    return res.status;
  }

  private async send(host: string, path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(k, String(item));
          }
        }
        continue;
      }
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
      throw new Error(formatJibbleError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
