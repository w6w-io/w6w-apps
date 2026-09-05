import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Frappe's generic REST API — verified against
 * `docs.frappe.io/framework/user/en/api/rest` (fetched 2026-09-05) and, for the
 * error envelope, directly against the framework's own source
 * (`frappe/utils/response.py`, `develop` branch, fetched the same day — see
 * `unwrapError` below).
 *
 * ## ERPNext has no REST surface of its own — this IS it
 *
 * ERPNext is an application built *on* the Frappe framework, and Frappe does
 * not hand-write endpoints per business object. Every business object —
 * Customer, Sales Order, Item, Lead, Employee, and any custom object an
 * installation adds — is a **DocType**, and Frappe derives one identical REST
 * surface for all of them from its own metadata:
 *
 *   - `GET    /api/resource/:doctype`         — list
 *   - `GET    /api/resource/:doctype/:name`   — read one
 *   - `POST   /api/resource/:doctype`         — create
 *   - `PUT    /api/resource/:doctype/:name`   — update
 *   - `DELETE /api/resource/:doctype/:name`   — delete
 *   - `GET|POST /api/method/:dotted.path`     — call a whitelisted Python method
 *
 * So "the API surface" is genuinely the connected site's own schema: which
 * DocTypes and fields exist depends on which ERPNext modules (Selling,
 * Accounting, HR, …) and custom apps that particular site has installed. This
 * app wraps the generic surface — list/get/create/update/delete plus the
 * submit/cancel lifecycle and a method-call escape hatch — rather than
 * hard-coding a schema for "Customer" or "Sales Order" that a real
 * installation could easily have customized away.
 *
 * ## There is no vendor host
 *
 * ERPNext is self-hosted (Frappe Cloud is one hosting option among several,
 * not a fixed API host every user shares), so the base URL is a Connection
 * field and the egress allowlist is `["*"]` — the posture this pack already
 * uses for `gitea`, `mautic`, `mattermost` and `jenkins`.
 */
export const RESOURCE_PATH = "/api/resource";
export const METHOD_PATH = "/api/method";

/** Public (redacted-safe) connection metadata. */
export interface ErpNextConnectionDisplay {
  /** The site origin, e.g. `https://mycompany.erpnext.com`. */
  baseUrl?: string;
  /** The user the API key belongs to, recorded for a useful connection label. */
  user?: string;
}

/**
 * Normalise a user-typed site URL into a bare origin.
 *
 * People paste `mycompany.erpnext.com`, `https://mycompany.erpnext.com/`, and
 * — because the docs' own curl examples write `<base-url>/api/method/...` —
 * plausibly a URL that already ends in `/api/resource/...` or `/app/...`
 * copied from the browser bar. All of that is reduced to the origin, so a
 * pasted path does not silently become `…/api/resource/api/resource/Customer`.
 *
 * A missing scheme defaults to `https`: an API secret in flight deserves TLS,
 * and producing `http://` from a bare hostname would silently downgrade the
 * credential's transport. An operator on a private network can still type
 * `http://` explicitly.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("ERPNext site URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`ERPNext site URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`ERPNext site URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the site origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as ErpNextConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this ERPNext connection records no site URL — reconnect it so the URL can be stored",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Drop keys the caller left unset so an update does not overwrite untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Parse a `json`-typed param, which arrives as either the raw string a user
 * typed or an already-parsed value, depending on the host.
 */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Frappe's `filters` / `or_filters` grammar: a JSON array of
 * `[fieldname, operator, value]` triples (or a plain `{field: value}` object
 * for equality-only filtering — the docs' own examples use the array form, so
 * that is what this app asks for).
 */
export function toFilters(value: unknown, field: string): unknown {
  const parsed = json(value, field);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed) && (typeof parsed !== "object" || parsed === null)) {
    throw new Error(`\`${field}\` must be a JSON array of [field, operator, value] triples`);
  }
  return parsed;
}

/**
 * Unwrap a Frappe error body.
 *
 * ## Verified against the framework's own response builder, not guessed
 *
 * Unlike Odoo's `/jsonrpc`, Frappe's REST layer sets a real HTTP status code
 * on failure (`frappe/utils/response.py#report_error`: `response.status_code =
 * status_code`) — so `res.ok` is trustworthy here, and this function only runs
 * once a request has already failed.
 *
 * The body it decorates comes from the same module's `_make_logs_v1` (the
 * default API version for the unversioned `/api/resource` and `/api/method`
 * paths this app uses — `/api/v2/...` is a separate, opt-in surface this app
 * does not target):
 *
 *   - `_server_messages` — a JSON-encoded array of JSON-encoded objects, one
 *     per `frappe.msgprint`/`frappe.throw` call, each carrying a `message`
 *     field. This is the human-authored explanation and is preferred when
 *     present.
 *   - `exception` — a single-line rendering of the Python exception, present
 *     when server tracebacks are allowed.
 *   - `exc_type` — the exception's class name, used as a fallback label.
 *
 * All three are absent on a site with tracebacks disabled in production, so
 * the raw response text is the final fallback rather than throwing
 * "undefined".
 */
export function unwrapError(status: number, text: string): string {
  let body: Record<string, unknown>;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return text || `HTTP ${status}`;
  }

  const serverMessages = body["_server_messages"];
  if (typeof serverMessages === "string") {
    try {
      const outer = JSON.parse(serverMessages) as string[];
      const messages = outer
        .map((entry) => {
          try {
            const inner = JSON.parse(entry) as { message?: string };
            return inner.message;
          } catch {
            return entry;
          }
        })
        .filter((m): m is string => Boolean(m));
      if (messages.length > 0) return messages.join("; ");
    } catch {
      // Fall through to the other shapes.
    }
  }

  if (typeof body["exception"] === "string" && body["exception"]) {
    return body["exception"] as string;
  }
  if (typeof body["exc_type"] === "string" && body["exc_type"]) {
    return `${body["exc_type"]}${body["message"] ? `: ${body["message"]}` : ""}`;
  }
  if (typeof body["message"] === "string" && body["message"]) {
    return body["message"] as string;
  }
  return text || `HTTP ${status}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ErpNextClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  private buildUrl(path: string, query?: Record<string, unknown>): URL {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
    return url;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `ERPNext ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ` +
          unwrapError(res.status, text),
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `/api/resource/:doctype` — the generic DocType surface. */
  resource<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(`${RESOURCE_PATH}${path}`, options);
  }

  /**
   * `/api/method/:dotted.path` — a whitelisted remote method call.
   *
   * Per the docs ("A successful response will return a JSON object with a
   * `message` key"), the return value is unwrapped from `{"message": ...}`
   * automatically, symmetrically with `resource()` unwrapping `{"data": ...}`
   * — a caller gets the method's actual return value, not the envelope.
   */
  async method<T = unknown>(dottedPath: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<{ message?: T }>(`${METHOD_PATH}/${dottedPath}`, options);
    return (body?.message) as T;
  }
}
