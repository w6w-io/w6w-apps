import type { HookContext } from "@w6w/types";

/**
 * AgencyZoom API v1 REST client.
 *
 * Everything in this module was verified on 2026-09-05 against AgencyZoom's own
 * OpenAPI 3.0 document (`app.agencyzoom.com/openapi/agencyzoom.yaml`, 316,160
 * bytes, `info.version` `1.0.0`) plus live probes against `api.agencyzoom.com`.
 * Nothing here came from a third-party integration directory.
 *
 * ## One host, one prefix — but the document's own label is wrong
 *
 * The document declares exactly one server, `https://api.agencyzoom.com`, and
 * every path in it carries the `/v1/api` prefix. The server entry is labelled
 * `"Mobile test server"` — that reads like a leftover from an internal doc
 * template, not a sandbox: it is the same host the product's own login screen
 * and mobile apps use, confirmed live (a bad-credential probe against
 * `POST /v1/api/auth/login` answers the documented `400` shape). There is no
 * separate production host to discover.
 *
 * ## Two error shapes, and the OpenAPI document only names one of them
 *
 * Every `400`/`500` response in the document is `{"error", "fieldErrors"}`
 * ({@link AgencyZoomErrorBody}). But a `401` — which no path in the document
 * declares as a possible response at all — answers a completely different,
 * undocumented shape, measured live against `GET /v1/api/employees` with both a
 * missing and a garbage bearer token:
 *
 *     {"name":"Unauthorized","message":"Your request was made with invalid credentials.","code":0,"status":401}
 *
 * That is a framework-level auth filter answering before the request reaches
 * AgencyZoom's own error handler, and it is why {@link formatAgencyZoomError}
 * and the login/`test` hooks try both shapes rather than assuming the
 * documented one.
 *
 * ## Money is in CENTS, and it says so inconsistently
 *
 * `PolicyUpdateRequest.premium` and `.brokerFee` are documented explicitly as
 * "in cents". `Lead.premium` and `Lead.quoted` carry no such note but are the
 * same figure on the same object graph (a lead's premium becomes a policy's
 * premium the moment it is sold) — reading them as dollars is the single
 * easiest way to post a policy at 100x. Every premium/fee param and output
 * field in this app says "(in cents)" explicitly, even where the vendor's own
 * schema does not, because the vendor is not itself consistent about saying so.
 *
 * ## Dates are free-text strings in at least three different formats
 *
 * The document's own examples disagree field-to-field: lead search filters use
 * `YYYY-MM-DD` (`startDate`, `lastActivityEarliestDate`), policy/opportunity
 * dates use `MM/dd/YYYY` (`PolicyUpdateRequest.effectiveDate`,
 * `LeadOpportunityCreateRequest.expiryDate`), and `birthday` /
 * `nextExpirationDate` are documented as `mm/dd/yy`. There is no date type in
 * this API — every one of these is a plain string param, passed through
 * verbatim, and each param below carries the vendor's own documented format in
 * its `hint` rather than a shared assumption.
 *
 * ## The rate limit is prose only
 *
 * The document's description states "120 calls per minute" (raised twice in
 * the changelog) but no endpoint documents a `429` response, and a live probe
 * against `POST /v1/api/auth/login` carries no `X-RateLimit-*` or
 * `Retry-After` header on a `400`. There is nothing to read `health/quota.ts`
 * declares this unavailable rather than guessing at a header that does not
 * exist.
 *
 * ## Three response envelopes, not one
 *
 * Most list endpoints (`/carriers`, `/employees`, `/lead-sources`,
 * `/locations`, `/life-professionals`) answer a **bare JSON array**. The write
 * endpoints answer `{"message", "id", "result"}` ({@link GenericSuccessResponse}).
 * `GET /v1/api/csrs` is the one exception among the reference lookups: it
 * answers `{"csrs": [...]}`, not a bare array — copying the `/carriers` shape
 * for it is a one-line bug that type-checks and returns `undefined`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.agencyzoom.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v1/api";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The documented `400`/`500` error shape. */
export interface AgencyZoomErrorBody {
  error?: string;
  fieldErrors?: Array<{ field?: string; error?: string }>;
}

/**
 * The undocumented shape a `401` actually carries — see the module doc. Also
 * observed on other framework-level refusals (malformed JSON bodies), so it is
 * checked for on every non-2xx response, not just 401s.
 */
export interface AgencyZoomFrameworkErrorBody {
  name?: string;
  message?: string;
  code?: number;
  status?: number;
}

/** `{"message", "id", "result"}` — the envelope for most create/update/delete calls. */
export interface GenericSuccessResponse {
  message?: string;
  id?: number;
  result?: boolean;
}

/** `BaseSearchResponse` — the paging envelope every `/…/list` search shares. */
export interface BaseSearchResponse {
  totalCount?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive: a status filter of
 * `0` and a page of `0` are both meaningful values, not absence.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed —
 * the host hands a `json`-typed param through in whichever shape it arrived.
 */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn an AgencyZoom error body into one actionable line, trying both known
 * shapes — see the module doc for why there are two.
 */
export function formatAgencyZoomError(
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
    const documented = parsed as AgencyZoomErrorBody;
    if (typeof documented.error === "string") {
      const fields = (documented.fieldErrors ?? [])
        .filter((f) => f?.field || f?.error)
        .map((f) => `${f.field ?? "?"}: ${f.error ?? "?"}`)
        .join("; ");
      return truncate(
        `AgencyZoom ${status} for ${method} ${path}: ${documented.error}` +
          (fields ? ` (${fields})` : ""),
      );
    }
    const framework = parsed as AgencyZoomFrameworkErrorBody;
    if (typeof framework.message === "string") {
      return truncate(
        `AgencyZoom ${status} ${framework.name ?? "error"} for ${method} ${path}: ` +
          framework.message,
      );
    }
  }
  return truncate(`AgencyZoom ${status} for ${method} ${path}: ${raw}`);
}

export class AgencyZoomClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.send<T>(path, { method: "GET", query });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.send<T>(path, { method: "POST", body });
  }

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.send<T>(path, { method: "PUT", body });
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.send<T>(path, { method: "DELETE" });
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
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
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatAgencyZoomError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
