import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * FreshBooks spreads its REST surface across three independent API
 * "domains" on the same host, `api.freshbooks.com` — verified directly
 * against freshbooks.com/api/identity_model and the per-resource reference
 * pages (clients, invoices, expenses, time_entries, project):
 *
 *   - **`accounting`** — clients, invoices, expenses, etc. Scoped by path to
 *     an `accountId` (FreshBooks' legacy "account" concept):
 *     `/accounting/account/{accountId}/invoices/invoices`.
 *   - **`timetracking`** — time entries. Scoped instead to a `businessId`
 *     (FreshBooks' newer "business" concept):
 *     `/timetracking/business/{businessId}/time_entries`.
 *   - **`projects`** — also scoped to `businessId`:
 *     `/projects/business/{businessId}/projects`.
 *
 * Neither id is on the OAuth token itself — both are discovered from
 * `GET /auth/api/v1/users/me` right after the token exchange and recorded on
 * the Connection's `display` by `auth/oauth2.ts#afterConnect`, the same
 * "resolve the tenant, then remember it" shape as this pack's Xero
 * (`tenantId`) and Jira (`cloudId`) apps — except here it is a *path*
 * segment two domains use, not a header, so it has to be read from
 * `ctx.connection.display` by the action's own request-builder rather than
 * stamped on by `sign`.
 */
export type Domain = "accounting" | "timetracking" | "projects";

const API_HOST = "api.freshbooks.com";

function domainBase(
  connection: RedactedConnection | undefined,
  domain: Domain,
): string {
  const display = (connection?.display ?? {}) as {
    accountId?: string;
    businessId?: string;
  };
  if (domain === "accounting") {
    if (!display.accountId) {
      throw new Error(
        "FreshBooks connection has no account id on record — reconnect so it can be resolved.",
      );
    }
    return `https://${API_HOST}/accounting/account/${encodeURIComponent(display.accountId)}`;
  }
  if (!display.businessId) {
    throw new Error(
      "FreshBooks connection has no business id on record — reconnect so it can be resolved.",
    );
  }
  return `https://${API_HOST}/${domain}/business/${encodeURIComponent(display.businessId)}`;
}

export interface RequestOptions {
  method?: string;
  /** Plain query params, merged as-is. */
  query?: Record<string, unknown>;
  /**
   * Accounting-domain list filters. FreshBooks wraps these as
   * `search[<name>]=<value>` (confirmed on the Clients reference page's
   * "Searches / Filters" section) — distinct from `timetracking`/`projects`,
   * whose filters are plain query params (confirmed on the Time Entries
   * reference page's "List Time Entries From A Specific Day" example).
   */
  search?: Record<string, unknown>;
  body?: unknown;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Drop keys the caller left unset so a merge doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Parse the "Additional fields" / "Fields" / "Filters" JSON params into a
 * plain object. Rejects anything that is not an object, so a typo fails here
 * rather than as an opaque error from FreshBooks.
 */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Parse the "Lines" JSON param (invoice line items) into an array. Rejects
 * anything that is not an array, so a typo fails here rather than as an
 * opaque error from FreshBooks.
 */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

/** Accounting-domain error body — `{ response: { errors: [{ message }] } }`. */
interface AccountingErrorBody {
  response?: { errors?: Array<{ message?: string; field?: string; errno?: number }> };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which injects it.
 *
 * `timetracking`/`projects` calls must NOT send a `Content-Type` header on a
 * GET — FreshBooks' own reference pages for both note "When using GET calls
 * for Projects and Time Tracking, please leave out the Content Type from
 * your header", so this client only sets it when a body is present.
 */
export class FreshBooksClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    domain: Domain,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${domainBase(this.ctx.connection, domain)}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    for (const [k, v] of Object.entries(options.search ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(`search[${k}]`, String(v));
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
      let detail = text;
      try {
        const body = JSON.parse(text) as AccountingErrorBody;
        const messages = body.response?.errors?.map((e) => e.message).filter(Boolean);
        if (messages?.length) detail = messages.join("; ");
      } catch {
        /* keep the raw body — timetracking/projects errors are plain text or unshaped JSON */
      }
      throw new Error(`FreshBooks ${res.status} for ${init.method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
