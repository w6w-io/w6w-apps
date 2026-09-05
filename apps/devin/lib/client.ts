import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Devin API v3 REST client (`api.devin.ai`).
 *
 * Everything in this module was verified on 2026-09-05 against Cognition's own
 * documentation (`docs.devin.ai/api-reference/*`, Mintlify-hosted, embedded
 * OpenAPI schema read directly out of each reference page) plus live,
 * unauthenticated probes against `api.devin.ai`. Nothing here came from a
 * third-party integration directory.
 *
 * ## v3, not v1 — the docs say so explicitly
 *
 * Devin ships three API generations. `docs.devin.ai/api-reference/authentication`
 * carries this exact warning:
 *
 * > Legacy API keys are deprecated. Use API v3 with service user authentication.
 *
 * v1 (`GET /v1/sessions`, `apk_`-prefixed keys) still answers on the wire —
 * unauthenticated it returns a real `401 {"detail":"Unauthorized"}` — but it is
 * the endpoint the vendor's own docs label deprecated, not a candidate
 * "successor" to weigh against v3. v2 sits in the same deprecated bucket
 * (enterprise org/member management only; it never had a session-create
 * endpoint of its own). So this app is built entirely against v3, which
 * Cognition's release notes describe as "coming out of beta" and "the primary
 * API for all Devin functionality" as of the same date this app was built.
 *
 * ## Every request is scoped to one organization
 *
 * Every v3 endpoint this app calls lives under
 * `/v3/organizations/{org_id}/...` — there is no account-wide "just give me my
 * sessions" path. `org_id` is not a secret, but it is not a free per-call
 * parameter either: a service user is provisioned INTO one organization (or,
 * for an enterprise service user, several — but still one per Connection's
 * worth of work), so it belongs to the Connection, the same way Freshdesk's
 * account subdomain does. `auth/api-key.ts`'s `afterConnect` echoes the
 * organization id the user typed onto the connection's display data; this
 * client reads it back from there rather than asking each Action to carry it.
 *
 * ## Two authentication principals, one header shape
 *
 * A **service user API key** and a **personal access token** are both
 * `cog_`-prefixed and both go on the wire as `Authorization: Bearer <token>` —
 * see `auth/api-key.ts`. The distinction (whose audit trail a call lands on,
 * whether it survives someone leaving the org) is Devin's problem, not this
 * app's; the wire format is identical either way.
 *
 * ## Errors are RFC 9457 `application/problem+json`
 *
 * A live probe on 2026-09-05 (`GET /v3/self` with a syntactically plausible
 * but fake token) returned:
 *
 * ```json
 * {"type":"about:blank","title":"Forbidden","status":403,"detail":"Unauthorized","instance":"/v3/self"}
 * ```
 *
 * matching the documented `Status`/`Title`/`Detail`/`Errors`/`Instance`/`Type`
 * problem shape exactly. `formatDevinError` below surfaces `title` and
 * `detail` together, because `detail` alone (often just "Unauthorized" or
 * "Not Found") repeats what the HTTP status already said, while `title` names
 * the RFC 9457 problem type.
 *
 * ## Cursor pagination, not offset/limit
 *
 * Every list endpoint takes `after` (opaque cursor) and `first` (page size,
 * default 100, max 200 — both documented in the embedded OpenAPI schema) and
 * answers `{ items, end_cursor, has_next_page, total }`. This client maps that
 * onto the platform's own `{ items, nextCursor? }` search-action shape
 * (`rfcs/action.md` § Pagination) rather than inventing a third pagination
 * vocabulary.
 */

export const API_BASE = "https://api.devin.ai";

/** A pull request a session opened, from `SessionPullRequest`. */
export interface SessionPullRequest {
  pr_url: string;
  pr_state: string | null;
}

/**
 * `SessionResponse` — the shape returned by create, get, archive and
 * send-message, and by each item in list's `items[]`. Fields present on every
 * response are required here; the rest (populated only once categorisation or
 * other background processing has run) are optional, matching the schema.
 */
export interface DevinSession {
  session_id: string;
  status: "new" | "claimed" | "running" | "exit" | "error" | "suspended" | "resuming";
  status_detail?: string | null;
  url: string;
  title?: string | null;
  org_id: string;
  created_at: number;
  updated_at: number;
  acus_consumed: number;
  pull_requests: SessionPullRequest[];
  tags: string[];
  is_archived?: boolean;
  devin_mode?: string | null;
  origin?: string | null;
  category?: string | null;
  subcategory?: string | null;
  playbook_id?: string | null;
  automation_id?: string | null;
  parent_session_id?: string | null;
  child_session_ids?: string[] | null;
  service_user_id?: string | null;
  user_id?: string | null;
  structured_output?: unknown;
}

export interface DevinListPage<T> {
  items: T[];
  end_cursor?: string | null;
  has_next_page?: boolean;
  total?: number;
}

/** The platform's own search-action pagination shape (`rfcs/action.md` § Pagination). */
export interface SearchResult<T> {
  items: T[];
  nextCursor?: string | null;
}

/** Convert a Devin cursor page into the platform's `{ items, nextCursor? }` shape. */
export function toSearchResult<T>(page: DevinListPage<T>): SearchResult<T> {
  return {
    items: page.items,
    nextCursor: page.has_next_page ? page.end_cursor ?? undefined : undefined,
  };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

/** RFC 9457 `application/problem+json` — the shape of every Devin v3 error. */
interface DevinProblem {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
  type?: string;
  errors?: Array<Record<string, unknown>>;
}

/**
 * The organization id the user entered at connect time, read off the
 * connection's display data (never off `credential` — Actions never see that).
 * See `auth/api-key.ts`'s `afterConnect`.
 */
export function orgIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { orgId?: string };
  if (display.orgId) return display.orgId;
  throw new Error(
    "Devin connection has no organization id — reconnect the account so it can be recorded.",
  );
}

/** Drop keys the caller left unset. `false` and `0` survive: both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/`array` param into a list, accepting a comma-joined string too. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can carry a long `errors` array. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Devin's RFC 9457 problem body into one actionable line.
 *
 * `title` names the problem type ("Forbidden", "Not Found", "Unprocessable
 * Entity"); `detail` carries the specific reason. Both are kept because
 * `detail` alone is often as bare as "Unauthorized" and repeats the status
 * code, while `title` is what Devin's own docs describe troubleshooting
 * against. `errors` (422 only) is joined in when present — it is where a
 * missing/invalid body field is actually named.
 */
export function formatDevinError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: DevinProblem | null = null;
  try {
    parsed = JSON.parse(raw) as DevinProblem;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.title && !parsed.detail)) {
    return `Devin ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Devin ${status} ${parsed.title ?? "error"} for ${method} ${path}`,
    parsed.detail,
    parsed.errors && parsed.errors.length > 0
      ? `field errors: ${truncate(JSON.stringify(parsed.errors), 400)}`
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class DevinClient {
  constructor(private ctx: HookContext) {}

  /** The organization id this Connection was set up for. See {@link orgIdFromConnection}. */
  get orgId(): string {
    return orgIdFromConnection(this.ctx.connection);
  }

  /** `GET/POST/... /v3/organizations/{org_id}/{path}`. */
  org<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(`/v3/organizations/${encodeURIComponent(this.orgId)}${path}`, options);
  }

  /** `GET /v3/self` — the one endpoint that carries no organization in its path. */
  self<T = unknown>(): Promise<T> {
    return this.request<T>("/v3/self");
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        // Devin's array query params (`tags`, `session_ids`, `origins`, …) are
        // documented as repeated keys, not one comma-joined value.
        for (const item of v) url.searchParams.append(k, String(item));
        continue;
      }
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatDevinError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
