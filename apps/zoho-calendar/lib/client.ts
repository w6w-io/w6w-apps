import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Calendar REST API client.
 *
 * Every path, parameter, and response shape here was verified live 2026-09-05 against
 * `https://www.zoho.com/calendar/help/api/*` (introduction, calendars-api + its five method pages,
 * events-api + its method pages, search-api, freebusy-api, response-codes) and unauthenticated live
 * probes against all eight regional hosts (see `lib/regions.ts`). Nothing here came from a
 * third-party integration directory or from this pack's other Zoho apps' assumptions.
 *
 * ## Write payloads travel as a JSON-encoded QUERY PARAMETER, not a request body
 *
 * Every documented "Sample Request" for POST/PUT — creating or updating a calendar or an event —
 * encodes the whole payload as `?calendarData={...}` / `?eventdata={...}`, a JSON-stringified value
 * in the URL, not `application/json` in the body. This is unlike every other Zoho product this pack
 * ships (CRM, Books, Desk all take a real JSON body) and is easy to miss if you carry that
 * assumption over — a JSON body posted to these endpoints is simply never read, and the request
 * fails as if the mandatory field were missing.
 *
 * ## The error envelope is `{"error":[{...}]}`, an ARRAY — not CRM/Books' flat object
 *
 * Confirmed live: `GET /api/v1/calendars` with no Authorization header answers `400
 * {"error":[{"description":"Invalid ticket.","error_code":"INVALID_TICKET","message":"INVALID_TICKET"}]}`;
 * the same call with a syntactically-plausible but dead token answers `401
 * {"error":[{"description":"Invalid OAuth token.","error_code":"INVALID_OAUTHTOKEN","message":"INVALID_OAUTHTOKEN"}]}`.
 * Two different `error_code` values worth telling apart in `auth/oauth2.ts`'s `test` hook, the same
 * way `zohobooks`/`zohodesk` distinguish their own two codes — but the shape itself (an array under
 * `error`, keyed `error_code`) is Calendar's own, not shared with those apps.
 *
 * ## Collection and single-record responses both wrap in a one-key object holding an ARRAY
 *
 * A list is `{"calendars": [...]}` / `{"events": [...]}`; a get/create/update/delete of one record
 * is the *same* shape with a single-element array — never a bare object. `unwrapFirst` below always
 * takes the first (and only) entry for the singular cases.
 *
 * ## No documented pagination
 *
 * `GET /calendars` returns every calendar in one response (a user's calendar count is small). `GET
 * .../events` has no page/per_page parameters at all — it is bounded instead by the mandatory
 * `range` window, which the API caps at 31 days (see `actions/event-list.ts`).
 */

/** Every documented Calendar endpoint hangs off this path segment. */
export const API_PREFIX = "/api/v1";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s `afterConnect` (one fixed
 * host per region-specific auth method — see `lib/regions.ts` for why there is no single `oauth2`
 * method with a data-centre field). Falls back to the US host only for a Connection that predates
 * `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

interface ZohoCalendarErrorEntry {
  description?: string;
  error_code?: string;
  message?: string;
}

interface ZohoCalendarErrorBody {
  error?: ZohoCalendarErrorEntry[];
}

/**
 * Turn a Zoho Calendar error response into one actionable line. `error_code` is the stable machine
 * token Zoho documents per failure (`INVALID_TICKET` = no usable auth header at all,
 * `INVALID_OAUTHTOKEN` = a token that reached the request but was rejected, ...); `description` is
 * always present and human-readable.
 */
export function formatCalendarError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ZohoCalendarErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoCalendarErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const entry = parsed?.error?.[0];
  if (!entry) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Calendar ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Calendar ${status}${
    entry.error_code ? ` (${entry.error_code})` : ""
  } for ${method} ${path}: ${entry.description ?? entry.message ?? "request failed"}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime routes every request
 * through the auth `sign` hook, which stamps `Zoho-oauthtoken`. Never sends a JSON body either —
 * see the module doc comment; every write payload is a query parameter this class's callers already
 * JSON-encoded.
 */
export class ZohoCalendarClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`https://${this.host}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.headers ?? {}),
    };

    const res = await this.ctx.fetch(url.toString(), { method, headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatCalendarError(res.status, method, url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** JSON-encode a value for use as a `calendarData`/`eventdata` query parameter. */
export function jsonParam(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Every Calendar collection response wraps under one key holding an array — `unwrapFirst` reads the
 * single entry a get/create/update/delete answers with; a genuine list action reads the array
 * itself instead (see `actions/calendar-list.ts`, `actions/event-list.ts`).
 */
export function unwrapFirst<T>(body: Record<string, unknown>, key: string, context: string): T {
  const arr = body[key];
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`Zoho Calendar response for ${context} carried no "${key}" entries`);
  }
  return arr[0] as T;
}

export function unwrapArray<T>(body: Record<string, unknown>, key: string): T[] {
  const arr = body[key];
  return Array.isArray(arr) ? (arr as T[]) : [];
}

/** Parse a JSON param (object or array) the caller may have sent as a string or already-parsed value. */
export function parseJsonParam(raw: unknown, paramName: string): unknown {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`\`${paramName}\` is not valid JSON: ${(e as Error).message}`);
  }
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
