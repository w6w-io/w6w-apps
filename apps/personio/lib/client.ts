import type { HookContext } from "@w6w/types";

/**
 * Personio REST client — the Personnel Data API.
 *
 * Everything in this module was verified on 2026-09-06 against Personio's **own**
 * OpenAPI sources, not the marketing docs. `developer.personio.de/reference/introduction`
 * states plainly: "This page builds up on our API docs in swagger format hosted on
 * [github](https://github.com/personio/api-docs)" — so this app was built from that
 * repository's `personio-personnel-data-api-oa3.yaml` and `personio-auth-api.yaml`
 * (fetched directly from `raw.githubusercontent.com/personio/api-docs`), plus one
 * ReadMe-hosted guide page (`/reference/authentication`) for behavior the OpenAPI
 * files don't state (token lifetime, the auth endpoint's own rate limit).
 *
 * ## One host, one bearer token, but a NON-standard token mint
 *
 * Every Personnel Data endpoint lives on `api.personio.de` and takes a plain
 * `Authorization: Bearer <token>` header (`securitySchemes.BearerAuth` in the OpenAPI
 * file). The token itself, though, is **not** a standard OAuth2 `client_credentials`
 * grant — despite Personio's own marketing calling it that. The real shape (from
 * `personio-auth-api.yaml`) is a plain REST call:
 *
 *     POST https://api.personio.de/v1/auth
 *     { "client_id": "...", "client_secret": "..." }
 *     -> { "success": true, "data": { "token": "papi-eyJ...", "expires_in": 86400 } }
 *
 * No `grant_type`, no `token_type`, no Basic-auth header — the credentials travel as a
 * JSON (or form-encoded) body. `auth/client-credentials.ts` implements exactly this.
 *
 * ## The token is STABLE for 24 hours — re-minting is not free
 *
 * Personio's own Authentication guide page states: "The bearer token generated is
 * specific to the Client ID and secret used and remains the same, i.e. stable, for a
 * period of 24 hours... This bearer token can be used for an indefinite number of calls
 * in the 24 hour period... and can also be used for parallel API calls." In other words,
 * calling `/v1/auth` again with the same credentials before expiry returns the SAME
 * token, not a new one — so a naive integration that re-authenticates on every request
 * burns needlessly into the auth endpoint's own separate rate limit (150 requests/minute;
 * throttled to 1/second for 60 seconds if exceeded, reset after that). `sign()` in
 * `auth/client-credentials.ts` reuses the cached `accessToken` and only calls `/v1/auth`
 * again via `refresh`/`test` when the runtime asks for it.
 *
 * ## Two completely different error postures for "bad credential"
 *
 * A MISSING Authorization header gets **401** with
 * `{"success":false,"error":{"code":401,"message":"Authorization is not provided"}}`.
 * An INVALID/expired token gets **403** with
 * `{"success":false,"error":{"code":403,"message":"Provided authorization is not valid"}}`.
 * Classification must read `error.message`/`error.code` from the body, never assume "403
 * = forbidden-but-authenticated" the way many other APIs do.
 *
 * ## Fields come pre-labelled, not as plain values
 *
 * Every employee attribute in a response is wrapped:
 * `{ "label": "First name", "value": "Alexander", "type": "standard", "universal_id":
 * "first_name" }` (custom/dynamic fields use `"type": "standard"` too and a
 * `dynamic_<id>` key instead of a `universal_id`). `flattenAttributes()` below unwraps
 * this into a plain `key -> value` record for actions that return an Employee, so a
 * workflow doesn't have to reach through `.value` on every field.
 *
 * The wrapper is NOT reused by every embedded relationship, though. A nested
 * **Employee** (e.g. `supervisor`) reuses it in full, but `Department`, `Office`,
 * `Subcompany`, `CostCenter`, `HolidayCalendar`, `TimeOffType`, `WorkSchedule` and `Team`
 * all embed as `{ type: "...", attributes: { id: 82957, name: "Cost center 1" } }` —
 * already-plain scalars. `flattenAttributes` special-cases on `type === "Employee"` so it
 * does not try to pull a `.value` out of a field that never had one.
 *
 * ## `/company/attendances` and `/company/attendances/projects` are DEPRECATED (v1)
 *
 * Both carry `deprecated: true` in the OpenAPI file with
 * `x-papi-meta.deprecation.effective_from: "2027-01-31T23:59:59Z"` and a named successor
 * (`/v2/attendance-periods`, `/v2/projects`) — but that v2 surface is **not** documented
 * anywhere in the same `api-docs` repository this app was built from. Per this app's own
 * rule ("if a detail can't be confirmed, leave it out and say so"), attendance/project
 * actions are left out entirely rather than shipping a soon-to-be-retired v1 surface or
 * guessing at an unpublished v2 schema. See the README.
 *
 * ## The Recruiting API is a SEPARATE credential and host contract
 *
 * `personio-recruiting-api.yaml` documents its own `bearerAuth` scheme whose token is a
 * static "Recruiting API Access Token" (`Settings > API > Access Data > Recruiting API
 * Access Token`) — it is **not** minted from the `/v1/auth` client-id/secret exchange
 * this app's auth method produces, and every recruiting call additionally requires a
 * `X-Company-ID` header the Personnel Data API never needs. The recruiting spec documents
 * no read-only, side-effect-free endpoint (only two `POST`s: create an application,
 * upload a document, both mutating), so there is no safe probe for a `test` hook to call.
 * For both reasons this app covers the Personnel Data API only; see the README for what
 * that leaves out.
 */

export const API_BASE = "https://api.personio.de";
export const API_PREFIX = "/v1";

/** `POST` here with a JSON (or form) body of `{ client_id, client_secret }`. */
export const AUTH_URL = `${API_BASE}${API_PREFIX}/auth`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue | QueryValue[]>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers, merged over the defaults (never used to carry a credential). */
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset. `false` and `0` survive: both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/** One wrapped Personio attribute — see the module doc's "Fields come pre-labelled" section. */
export interface PersonioAttribute {
  label?: string;
  value?: unknown;
  type?: string;
  universal_id?: string | null;
}

/**
 * Unwrap a Personio `{ attributes: { key: { label, value, ... } } }` object into a plain
 * `key -> value` record.
 *
 * A nested relationship value (`{ type: "...", attributes: {...} }`) is flattened too —
 * but NOT uniformly. Only a nested **Employee** (e.g. `supervisor`) reuses the full
 * per-field `{ label, value, ... }` wrapper; every other relationship Personio embeds
 * (`Department`, `Office`, `Subcompany`, `CostCenter`, `HolidayCalendar`, `TimeOffType`,
 * `WorkSchedule`, `Team`, ...) already carries PLAIN scalar attributes
 * (`{ type: "CostCenter", attributes: { id: 82957, name: "Cost center 1" } }`) and must
 * not be run through the wrapped unwrapper a second time — doing so reads every field as
 * `undefined`, since a plain number has no `.value` to pull out.
 */
export function flattenAttributes(
  attributes: Record<string, PersonioAttribute> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(attributes ?? {})) {
    out[key] = flattenValue(field?.value);
  }
  return out;
}

function flattenValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(flattenValue);
  if (value && typeof value === "object" && "attributes" in (value as Record<string, unknown>)) {
    const obj = value as { type?: string; attributes?: unknown };
    if (obj.type === "Employee") {
      return {
        type: obj.type,
        ...flattenAttributes(obj.attributes as Record<string, PersonioAttribute> | undefined),
      };
    }
    // Every other embedded relationship already carries plain scalar attributes.
    return { type: obj.type, ...(obj.attributes as Record<string, unknown> ?? {}) };
  }
  return value;
}

/**
 * A `TimeOffPeriod` / hourly absence-period resource, as returned by `/company/time-offs`
 * and `/company/absence-periods`.
 *
 * ## The label/value wrapper is NOT applied consistently across one response
 *
 * An Employee resource wraps EVERY field in `{ label, value, type, universal_id }` (see
 * `flattenAttributes` above) — but a TimeOffPeriod's own top-level fields (`id`, `status`,
 * `start_date`, ...) and its embedded `time_off_type.attributes` are plain scalars, NOT
 * wrapped. The one exception, inside the very same object, is the embedded `employee`
 * relationship: `employee.attributes` DOES use the full per-field wrapper, exactly like a
 * standalone Employee response. `flattenTimeOffPeriod` below exists because a single
 * generic unwrapper cannot handle both shapes at once — code written against one absence
 * response and assumed to generalize to the other silently reads `undefined` off the
 * unwrapped fields.
 */
export interface TimeOffPeriodResource {
  type?: string;
  attributes?: {
    id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    days_count?: number;
    half_day_start?: boolean;
    half_day_end?: boolean;
    comment?: string;
    time_off_type?: { attributes?: { id?: number; name?: string; category?: string } };
    employee?: { attributes?: Record<string, PersonioAttribute> };
    certificate?: { status?: string };
    created_at?: string;
    created_by?: string;
    updated_at?: string;
  };
}

export function flattenTimeOffPeriod(period: TimeOffPeriodResource | undefined): unknown {
  const a = period?.attributes;
  if (!a) return undefined;
  return {
    id: a.id,
    status: a.status,
    startDate: a.start_date,
    endDate: a.end_date,
    daysCount: a.days_count,
    halfDayStart: a.half_day_start,
    halfDayEnd: a.half_day_end,
    comment: a.comment,
    timeOffType: a.time_off_type?.attributes,
    employee: flattenAttributes(a.employee?.attributes),
    certificateStatus: a.certificate?.status,
    createdAt: a.created_at,
    createdBy: a.created_by,
    updatedAt: a.updated_at,
  };
}

/** Personio's documented error envelope: `{ success: false, error: { code, message } }`. */
export interface PersonioErrorBody {
  success?: boolean;
  error?: { code?: number | string; message?: string; detailed_message?: unknown };
}

/**
 * Turn a failed response into one actionable line, reading the documented
 * `{ success: false, error: { code, message } }` envelope rather than trusting the HTTP
 * status alone — see the module doc's "Two completely different error postures" section.
 */
export async function formatPersonioError(
  res: Response,
  method: string,
  path: string,
): Promise<string> {
  const raw = await res.text().catch(() => "");
  let detail: string | undefined;
  try {
    const parsed = raw ? (JSON.parse(raw) as PersonioErrorBody) : undefined;
    if (parsed?.error?.message) detail = parsed.error.message;
  } catch {
    if (raw) detail = raw.slice(0, 400);
  }
  const parts = [`Personio ${res.status} for ${method} ${path}`, detail].filter(Boolean);
  return parts.join(": ");
}

function applyQuery(
  url: URL,
  query: Record<string, QueryValue | QueryValue[]> | undefined,
): void {
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === undefined || item === null || item === "") continue;
        url.searchParams.append(`${k}[]`, String(item));
      }
    } else {
      url.searchParams.set(k, String(v));
    }
  }
}

/**
 * A single JSON request against the Personnel Data API.
 *
 * Auth is never set here: the runtime signs the request (bearer token) between this call
 * and the wire, per `auth/client-credentials.ts`. This helper only shapes the URL, query,
 * JSON body and headers.
 */
export async function requestJson<T = unknown>(
  ctx: HookContext,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
  applyQuery(url, options.query);

  const headers: Record<string, string> = { accept: "application/json", ...options.headers };
  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const res = await ctx.fetch(url.toString(), init);
  if (!res.ok) {
    throw new Error(await formatPersonioError(res, init.method ?? "GET", url.pathname));
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * `POST /company/time-offs` documents ONLY an `application/x-www-form-urlencoded` request
 * body — unlike Create/Update Employee, which accept JSON. Sending JSON there is not a
 * documented option, so this helper exists specifically for that shape.
 */
export async function requestForm<T = unknown>(
  ctx: HookContext,
  path: string,
  method: string,
  body: Record<string, QueryValue>,
): Promise<T> {
  const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null || v === "") continue;
    form.set(k, String(v));
  }
  const res = await ctx.fetch(url.toString(), {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(await formatPersonioError(res, method, url.pathname));
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
