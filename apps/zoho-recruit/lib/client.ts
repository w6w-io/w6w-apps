import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Recruit REST API client.
 *
 * Every path, query parameter, body field and response shape here was
 * verified on 2026-09-05 against Zoho's own documentation
 * (`https://www.zoho.com/recruit/developer-guide/apiv2/` — modules-api,
 * get-records, insert-records, update-records, delete-records,
 * search-records, change-status, create/get/update/delete-notes, get-users,
 * oauth-overview, multi-dc, limits) and live probes against all ten regional
 * API hosts (see `lib/regions.ts`).
 *
 * ## The response envelope is `{"data": [...]}` — the same shape as Zoho CRM
 *
 * A List answers `{"data": [...], "info": {...}}`; a Get wraps the single
 * record inside that same `data` array. Insert/Update/Delete/status-change
 * all answer batch-style, one entry per record submitted, even for the single
 * record this app always sends: `{"data": [{"code","details","message",
 * "status"}]}` — {@link unwrapRecordResult} unwraps that and turns a per-item
 * `status: "error"` into a thrown error even when the HTTP status itself was
 * 2xx, which is how Zoho reports a rejected record inside an
 * otherwise-successful batch response. **Change Status nests one level
 * deeper** — `{"data": [[{"code",...}]]}`, an array of arrays — see
 * {@link unwrapStatusResult}.
 *
 * ## The error shape carries a STRING `code`, unlike Zoho Books' numeric one
 *
 * An unauthenticated request answers `401
 * {"code":"AUTHENTICATION_FAILURE","message":"Authentication failed",
 * "status":"error"}`; the same request with a syntactically-plausible but
 * dead token answers `401 {"code":"INVALID_TOKEN","message":"invalid oauth
 * token","status":"error"}` — two different problems worth telling apart in
 * `auth/oauth2.ts`'s `test` hook (confirmed live against `recruit.zoho.com`).
 * A third documented code, `OAUTH_SCOPE_MISMATCH`, fires when the token is
 * live but lacks a scope the endpoint needs.
 *
 * ## `fields` is OPTIONAL on Get Records — unlike Zoho CRM's identical-looking
 * ## endpoint, which 400s without it
 *
 * Zoho CRM's `/crm/v6/{module}` (see this pack's `zoho` app) requires an
 * explicit `fields` query param on every list/get. Zoho Recruit's own
 * parameter table for the same-shaped `/recruit/v2/{module}` documents
 * `fields` as `(optional)` — every list/get action here leaves it unset by
 * default rather than shipping a forced field list to work around a
 * requirement that does not exist for this product.
 */

/** The Zoho Recruit REST API version this app targets. */
export const API_VERSION = "v2";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s
 * `afterConnect` (one fixed host per region-specific auth method — see
 * `lib/regions.ts` for why there is no single `oauth2` method with a
 * data-centre field). Falls back to the US host only for a Connection that
 * predates `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/** Zoho Recruit module API names are identifiers, not free text. */
export function moduleName(name: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(
      `\`${name}\` is not a valid Zoho Recruit module API name (letters, digits and underscores only).`,
    );
  }
  return name;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

interface ZohoRecruitErrorBody {
  code?: string;
  message?: string;
  status?: string;
}

/**
 * Turn a Zoho Recruit error response into one actionable line. `code` is the
 * stable machine token Zoho documents (`AUTHENTICATION_FAILURE`,
 * `INVALID_TOKEN`, `OAUTH_SCOPE_MISMATCH`, `INVALID_MODULE`, `INVALID_DATA`,
 * `MANDATORY_NOT_FOUND`, ...) — a string, like Zoho Desk's `errorCode` rather
 * than Zoho Books' numeric `code`. `message` is always present.
 */
export function formatRecruitError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ZohoRecruitErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoRecruitErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Recruit ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Recruit ${status}${
    parsed.code ? ` (${parsed.code})` : ""
  } for ${method} ${path}: ${parsed.message}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoRecruitClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`https://${this.host}/recruit/${API_VERSION}${path}`);
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
      throw new Error(formatRecruitError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** One entry of the `data` array insert/update/delete/notes all answer with. */
export interface ZohoRecruitRecordResult {
  code: string;
  details?: Record<string, unknown>;
  message?: string;
  status: "success" | "error";
}

/**
 * Insert, update, delete and note create/update/delete all answer
 * `{"data": [{code,status,...}]}` — one entry per record submitted,
 * batch-style, even for the single record this app always submits. Unwrap
 * that single entry, and surface a per-item failure (`status: "error"`) as a
 * thrown error even when the HTTP status itself was 2xx, which is how Zoho
 * reports a rejected record inside an otherwise-successful batch response.
 */
export function unwrapRecordResult(
  body: { data?: ZohoRecruitRecordResult[] },
): ZohoRecruitRecordResult {
  const entry = body.data?.[0];
  if (!entry) throw new Error("Zoho Recruit returned no result entry");
  if (entry.status === "error") {
    throw new Error(`Zoho Recruit ${entry.code}: ${entry.message ?? "request failed"}`);
  }
  return entry;
}

/**
 * Change Status nests one level deeper than every other write endpoint:
 * `{"data": [[{code,status,...}]]}` — an outer array (one entry per status
 * request submitted, always one here) wrapping an inner array (one entry per
 * record id changed). Flattens to the per-id results for the single status
 * request this app always submits.
 */
export function unwrapStatusResult(
  body: { data?: ZohoRecruitRecordResult[][] },
): ZohoRecruitRecordResult[] {
  const group = body.data?.[0];
  if (!group) throw new Error("Zoho Recruit returned no status-change result");
  const failed = group.find((entry) => entry.status === "error");
  if (failed) {
    throw new Error(`Zoho Recruit ${failed.code}: ${failed.message ?? "status change failed"}`);
  }
  return group;
}

/** Parse a "Fields" JSON param into the record body Zoho Recruit expects. */
export function fields(raw: unknown, paramName = "fields"): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object of field -> value.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object of field -> value.`);
  }
  return parsed as Record<string, unknown>;
}
