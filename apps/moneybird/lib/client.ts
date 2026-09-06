import type { HookContext } from "@w6w/types";

/**
 * Moneybird REST API v2 client.
 *
 * Verified against Moneybird's own published OpenAPI document
 * (`https://raw.githubusercontent.com/moneybird/openapi/refs/heads/main/openapi.yml`,
 * 55,154 lines, downloaded and grepped directly — linked from the docs site's own
 * "Download OpenAPI Specification" button) plus `developer.moneybird.com`'s
 * "Introduction" and "Authentication" pages, fetched 2026-09-06.
 *
 * ## One host, per-administration paths
 *
 * Every request goes to the fixed host `moneybird.com` (there is no separate
 * `moneybird.nl` API host — only the marketing site has an `.nl` sibling), but
 * almost every path carries an `:administration_id` segment naming the
 * bookkeeping entity to operate on:
 *
 *     https://moneybird.com/api/v2/:administration_id/:resource_path.json
 *
 * A token (personal API token or OAuth access token) can reach several
 * administrations, and there is no single request that says which one a
 * caller "means" — so, exactly like this pack's Xero and Jira clients, a
 * Connection resolves and remembers ONE administration id at connect time
 * (`auth/*.ts`'s `afterConnect`, via {@link fetchAdministrations}) and every
 * action defaults to it. An action may still override it with an explicit
 * `administrationId` param for a token that reaches more than one.
 *
 * `GET /administrations.json` is the one endpoint with no administration in
 * its path — it is how a token discovers which administrations it can even
 * address.
 *
 * ## Errors — two shapes, not one
 *
 * A 4xx/5xx body is one of:
 *  - `{"error": "message", "symbolic": {...}}` — `symbolic_error`, used for
 *    auth failures, 404s, and most one-line rejections.
 *  - `{"error": {"field": ["message", ...], ...}}` — `non_symbolic_error`,
 *    Rails-style per-field validation errors, used for 422s from a create/update.
 * {@link formatMoneybirdError} renders whichever one comes back.
 *
 * ## Pagination
 *
 * List endpoints take `page` (default 1) and `per_page` (default 50, max 100)
 * query parameters and answer a bare JSON array — there is no envelope and,
 * per the OpenAPI document, contacts/sales_invoices do not carry the `Link` /
 * `X-Total-Count` response headers the docs' "Introduction" page describes in
 * general terms (only a few report/export endpoints do). So paging here means
 * re-requesting with an incremented `page` until a short page comes back, not
 * following a header.
 *
 * ## IDs
 *
 * Every id is a large integer Moneybird recommends treating as a string (the
 * OpenAPI `identifier` schema is `type: [string, integer]`). Administration
 * ids in particular come back as either — the "list all administrations"
 * examples show both a numeric `123` and a stringified `"178852291862870122"`
 * for otherwise-identical administrations — so this client always coerces
 * with `String(...)` before using an id in a path or comparing it.
 */

/** The one and only API host. Declare exactly this in `w6w.network.allow`. */
export const API_HOST = "moneybird.com";

export const API_BASE = `https://${API_HOST}/api/v2`;

/** The one endpoint with no `:administration_id` in its path. */
export const ADMINISTRATIONS_URL = `${API_BASE}/administrations.json`;

export interface MoneybirdAdministration {
  id: string | number;
  name?: string;
  language?: string;
  currency?: string;
  country?: string;
  time_zone?: string;
  access?: string;
  suspended?: boolean;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
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
 * Parse a `json` param (line items, custom fields) into an array.
 *
 * Rejects anything that is not an array, so a typo in a workflow's JSON param
 * fails here with a clear message rather than as an opaque Moneybird 422.
 */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

interface SymbolicErrorBody {
  error?: string;
  symbolic?: Record<string, unknown>;
}

interface NonSymbolicErrorBody {
  error?: Record<string, unknown>;
}

/**
 * Render whichever of Moneybird's two error shapes came back into one
 * actionable line. See the module doc for what each shape is.
 */
export function formatMoneybirdError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // not JSON — fall through to the raw body below
  }

  if (parsed && typeof parsed === "object") {
    const errorField = (parsed as { error?: unknown }).error;

    if (typeof errorField === "string") {
      const symbolic = (parsed as SymbolicErrorBody).symbolic;
      const detail = symbolic && Object.keys(symbolic).length > 0
        ? ` (${Object.entries(symbolic).map(([k, v]) => `${k}: ${v}`).join(", ")})`
        : "";
      return `Moneybird ${status} for ${method} ${path}: ${errorField}${detail}`;
    }

    if (errorField && typeof errorField === "object" && !Array.isArray(errorField)) {
      const fields = Object.entries(errorField as Record<string, unknown>)
        .map(([field, messages]) =>
          `${field} ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`
        )
        .join("; ");
      return `Moneybird ${status} for ${method} ${path}: ${fields}`;
    }
  }

  return `Moneybird ${status} for ${method} ${path}: ${truncate(raw)}`;
}

/**
 * Resolve which administration a call should target: an explicit per-call
 * override, else the one the Connection resolved at connect time.
 *
 * Throws rather than silently guessing — a call against the wrong
 * administration would write to the wrong company's books.
 */
export function resolveAdministrationId(
  ctx: HookContext,
  override?: string | number,
): string {
  if (override !== undefined && override !== null && override !== "") return String(override);
  const display = ctx.connection?.display as { administrationId?: string | number } | undefined;
  if (display?.administrationId !== undefined && display.administrationId !== null) {
    return String(display.administrationId);
  }
  throw new Error(
    "No Moneybird administration_id resolved. This connection did not discover any " +
      "accessible administration when it was connected, and none was given via the " +
      '"Administration ID" param — pass one explicitly, or use "List Administrations" to find one.',
  );
}

/**
 * Fetch `GET /administrations.json`.
 *
 * Takes pre-built headers rather than a token: stamping credentials is the
 * `sign` hook's job alone, so an `auth/*.ts` caller running during its own
 * `test`/`afterConnect` (before `sign` applies) builds the `authorization`
 * header itself and passes it in here — this function and every other export
 * in this file must never touch one directly. A normal Action calls this with
 * no extra headers at all, since the runtime's `sign` hook has already signed
 * `ctx.fetch` by the time an Action runs.
 */
export async function fetchAdministrations(
  ctx: HookContext,
  extraHeaders: Record<string, string> = {},
): Promise<MoneybirdAdministration[]> {
  const headers: Record<string, string> = { accept: "application/json", ...extraHeaders };
  const res = await ctx.fetch(ADMINISTRATIONS_URL, { headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatMoneybirdError(res.status, "GET", "/administrations.json", text));
  }
  if (!text) return [];
  return JSON.parse(text) as MoneybirdAdministration[];
}

/**
 * A REST client bound to one administration. Never sets `Authorization` —
 * every request the runtime routes through this client has already been
 * signed by `auth/*.ts`'s `sign` hook.
 */
export class MoneybirdClient {
  constructor(private ctx: HookContext, private administrationId: string) {}

  private buildUrl(resourcePath: string, query: RequestOptions["query"]): URL {
    const url = new URL(`${API_BASE}/${this.administrationId}${resourcePath}.json`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  /** `resourcePath` starts with `/` and carries no `.json` suffix, e.g. `/contacts`. */
  async request<T = unknown>(resourcePath: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(resourcePath, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatMoneybirdError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow (or rather, deliberately not follow) a `302` to a short-lived,
   * pre-signed download URL — e.g. `GET .../download_pdf`, valid 30 seconds
   * per the vendor's own docs. Returns the `Location` header without ever
   * fetching the file's bytes, since the redirect target is not
   * `moneybird.com` and cannot be declared in `network.allow` (it is a
   * per-request signed link on Moneybird's storage backend).
   */
  async redirectLocation(resourcePath: string, options: RequestOptions = {}): Promise<string> {
    const url = this.buildUrl(resourcePath, options.query);
    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
      redirect: "manual",
    });
    if (res.status !== 302) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `${formatMoneybirdError(res.status, "GET", url.pathname, text)} (expected a 302 redirect)`,
      );
    }
    const location = res.headers.get("location");
    if (!location) {
      throw new Error(`Moneybird returned 302 for GET ${url.pathname} with no Location header`);
    }
    return location;
  }
}
