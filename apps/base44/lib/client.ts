import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Base44's Enterprise workspace APIs — the Monitoring API and the Audit Logs
 * API — verified against the vendor's own published OpenAPI 3.1 documents:
 *
 *   - `docs.base44.com/developers/references/monitoring-api/monitoring-openapi.json`
 *     (58,721 bytes, 10 operations)
 *   - `docs.base44.com/developers/references/audit-logs-api/audit-logs-openapi.json`
 *     (19,277 bytes, 2 operations)
 *
 * both fetched 2026-08-24, plus the prose pages that surround them
 * (`developers/references/monitoring-api/get-started/*`,
 * `developers/references/audit-logs-api/get-started/*`).
 *
 * ## Why this app is scoped to these two APIs and nothing else
 *
 * Base44's headline developer surface is a proprietary JavaScript SDK
 * (`@base44/sdk`), not a documented plain-HTTP contract: `createClient()`
 * defaults to `https://base44.app` and takes an `appId`, but the wire
 * protocol its `entities`/`auth`/`functions` modules speak is never published
 * as REST paths, request bodies, or response shapes anywhere in the docs —
 * only as SDK method calls. Building actions against that surface would mean
 * guessing at an undocumented internal protocol, which `build-a-w6w-app.md`
 * rules out ("If a detail can't be confirmed, leave it out").
 *
 * Two other paths were checked and rejected for the same reason:
 *
 *   - **Backend functions** (`docs.base44.com/developers/backend/resources/
 *     backend-functions/overview.md`) are reachable over plain HTTP at
 *     `https://<your-app-domain>/functions/<function-name>` — but that host is
 *     a DIFFERENT PER-APP DOMAIN for every Base44 app (the doc's own example:
 *     `your-app.base44.app`), not a fixed apex this app's `network.allow`
 *     could enumerate. That fails the fixed-hostname feasibility gate outright.
 *   - **Entity CRUD in general** requires either a logged-in end user
 *     (`loginViaEmailPassword`, a session flow with no documented token
 *     endpoint outside the SDK) or `asServiceRole`, which the SDK docs state
 *     explicitly is "only available in Base44-hosted backend functions" —
 *     i.e. never reachable from an external caller like this app at all.
 *
 * The Monitoring and Audit Logs APIs are the one place Base44 documents a
 * plain REST contract end to end: a fixed host, a stable `api_key` header,
 * OpenAPI-declared paths/params/schemas, and workspace-scoped resources
 * addressed by a `workspace_id` PATH SEGMENT — the same "dynamic path under a
 * fixed host" shape this pack already uses for Airtable's `baseId` or
 * dbt Cloud's `accountId`. Both are Enterprise-plan-gated (`docs.base44.com/
 * developers/references/enterprise-apis.md`: "Base44 provides REST APIs for
 * enterprise plan workspaces"), and both are bundled as one product on that
 * same "Enterprise APIs" page — which is why one app, one client, and one
 * `api_key` credential cover both here rather than splitting them.
 *
 * ## One host, two API roots
 *
 * Both OpenAPI documents declare `https://app.base44.com` as the only server,
 * under `/api/v1/monitoring` and `/api/v1/audit-logs` respectively.
 *
 * ## Auth is a plain header, not Authorization
 *
 * Both APIs read the key from a literal `api_key` header (not `Authorization:
 * Bearer`) — confirmed by both `get-started/authentication.md` pages and by
 * `components.securitySchemes.ApiKeyAuth` (`{"type":"apiKey","in":"header",
 * "name":"api_key"}`) in both OpenAPI documents.
 *
 * ## The two APIs accept different key scopes — this is the trap
 *
 * The Monitoring API accepts a **personal** API key (any workspace admin/owner)
 * or a **workspace** key carrying "Read monitoring data". The Audit Logs API
 * accepts **only** a workspace key, and only one scoped specifically to
 * `audit_logs:read` — a personal key is rejected outright regardless of the
 * user's role. A single credential pasted into this app's one Auth method may
 * therefore work for one half of these actions and 401/403 on the other; that
 * is a scope mismatch, not proof the key is dead. See `auth/api-key.ts` for
 * how the connection test accounts for this.
 *
 * ## Errors
 *
 * A validation failure (bad query param, malformed body) answers `422` with
 * `{"detail": [{"loc", "msg", "type"}, ...]}` (FastAPI's standard shape,
 * `HTTPValidationError` in both documents). Auth/authorization failures and
 * rate limits are documented only as bare status codes (`401`, `403`, `429`)
 * with no declared JSON body, so those are reported by status code alone.
 *
 * ## No documented quota signal
 *
 * Neither API's rate-limit pages (`get-started/rate-limits.md`) document a
 * response header carrying a remaining-request count or a reset time — only a
 * flat req/min ceiling per endpoint and a bare `429` once it's exceeded. There
 * is nothing here for a `quota` health check to read.
 */

/** The one and only host for both Enterprise APIs. */
export const API_HOST = "https://app.base44.com";

export const MONITORING_ROOT = `${API_HOST}/api/v1/monitoring`;
export const AUDIT_LOGS_ROOT = `${API_HOST}/api/v1/audit-logs`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /**
   * `unknown`, not `QueryValue`: action params arrive typed `unknown` off the
   * form, and every value is stringified in `send()` regardless — narrowing
   * here would just move the cast to every call site.
   */
  query?: Record<string, unknown>;
  body?: unknown;
}

interface ValidationErrorItem {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}

interface ValidationErrorBody {
  detail?: ValidationErrorItem[] | string;
}

/** Drop keys the caller left unset, so an omitted filter is absent rather than `"undefined"`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Both `list-*` endpoints validate `from`/`to` (and `start_date`/`end_date`)
 * against `YYYY-MM-DD` (or `YYYY-MM-DDTHH:MM:SSZ` for audit logs). This
 * leaves an already-correct string alone and only reports a genuinely
 * malformed one, rather than silently reformatting a caller's input.
 */
export function requireDateOrUndefined(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/.test(s)) {
    throw new Error(`${field} must be in YYYY-MM-DD (or YYYY-MM-DDTHH:MM:SSZ) format, got "${s}"`);
  }
  return s;
}

/** Turn a `422` body into one actionable line; falls back to the raw text for anything else. */
export function formatBase44Error(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  if (status === 422) {
    try {
      const body = JSON.parse(raw) as ValidationErrorBody;
      if (Array.isArray(body.detail)) {
        const parts = body.detail.map((d) => `${(d.loc ?? []).join(".")}: ${d.msg ?? d.type}`);
        return `Base44 422 for ${method} ${path}: ${parts.join("; ")}`;
      }
      if (typeof body.detail === "string") {
        return `Base44 422 for ${method} ${path}: ${body.detail}`;
      }
    } catch { /* not the documented validation shape — fall through */ }
  }
  if (status === 401) {
    return `Base44 401 for ${method} ${path}: invalid or disabled API key`;
  }
  if (status === 403) {
    return `Base44 403 for ${method} ${path}: the key lacks the scope this endpoint needs — a ` +
      "personal key cannot call the Audit Logs API, and a workspace key needs the matching scope " +
      "(Read monitoring data / audit_logs:read) plus admin or owner role";
  }
  if (status === 429) {
    return `Base44 429 for ${method} ${path}: rate limited — wait before retrying`;
  }
  const trimmed = raw.length > 500 ? `${raw.slice(0, 500)}… (${raw.length} bytes truncated)` : raw;
  return `Base44 ${status} for ${method} ${path}: ${trimmed || "(empty body)"}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets the `api_key` header — the
 * runtime routes every action request through the auth `sign` hook, which is
 * the only code holding the credential.
 */
export class Base44Client {
  constructor(private ctx: HookContext, private root: string) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.root}${path}`);
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
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(formatBase44Error(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** A client bound to the Monitoring API root (`/api/v1/monitoring`). */
export function monitoringClient(ctx: HookContext): Base44Client {
  return new Base44Client(ctx, MONITORING_ROOT);
}

/** A client bound to the Audit Logs API root (`/api/v1/audit-logs`). */
export function auditLogsClient(ctx: HookContext): Base44Client {
  return new Base44Client(ctx, AUDIT_LOGS_ROOT);
}

/**
 * The workspace id every path needs.
 *
 * Base44 documents no endpoint that lists the workspaces a key can reach, so
 * — unlike this pack's dbt Cloud app, which discovers its account id from the
 * API itself — the id is collected once at connect time (`auth/api-key.ts`)
 * and echoed here from the redacted Connection rather than re-typed into
 * every action.
 */
export function workspaceIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { workspaceId?: string };
  const id = String(display.workspaceId ?? "").trim();
  if (!id) {
    throw new Error(
      "this connection has no workspace id — reconnect it with the Workspace ID field set",
    );
  }
  return id;
}
