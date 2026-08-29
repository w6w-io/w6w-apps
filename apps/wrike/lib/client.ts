import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Wrike API v4 REST client.
 *
 * Every path, parameter and response shape here was verified on 2026-08-29
 * against Wrike's own machine-readable OpenAPI 3.0.1 documents, published one
 * per endpoint at `developers.wrike.com/reference/<operationId>` (there is no
 * single combined spec), plus a live probe of `www.wrike.com/api/v4/version`.
 * Nothing here came from a third-party integration directory.
 *
 * ## Every request body is a query string
 *
 * This is the single most surprising thing about this API, and getting it
 * wrong is the most common way a Wrike integration silently does nothing:
 * **POST and PUT never take a JSON body.** Every field Wrike's own OpenAPI
 * documents for "Create Task", "Update Folder", etc. is declared
 * `"in": "query"` — including arrays and objects, which are JSON-encoded and
 * then placed in the query string as a single value (e.g.
 * `?dates=%7B%22start%22%3A...%7D`). A client that POSTs a JSON body instead
 * (the obvious thing to do, and correct for almost every other REST API in
 * this pack) gets back a *successful*-looking response with none of the
 * fields applied, because Wrike simply never saw them.
 *
 * {@link WrikeClient.send} therefore serializes every parameter — scalar or
 * structured — into the query string for every verb, and never sets a request
 * body at all.
 *
 * ## Three regional hosts, chosen at connect time
 *
 * Wrike stores customer data in one of three fixed data centers, and the
 * correct API host depends on which one the account lives in:
 * `www.wrike.com`, `app-eu.wrike.com`, `app-us2.wrike.com` (all documented as
 * `servers` in every endpoint's OpenAPI definition, and confirmed for OAuth in
 * `docs/oauth-20-authorization`, which returns the assigned `host` in the
 * token exchange response and warns "you need to use a specific base URL to
 * access user's data, based on where it is located"). A request against the
 * wrong host answers `401 not_authorized`, identical to an invalid token.
 *
 * A Permanent Access Token is generated from inside an already-logged-in
 * workspace, so the host is a property of the *connection*, not the
 * credential's bytes. It is collected as an ordinary (non-secret) Auth field
 * and echoed onto the Connection's `display` by `afterConnect`
 * (`auth/permanent-token.ts`); {@link hostFromConnection} is how every action
 * and health check reads it back, exactly the pattern Zendesk's per-account
 * subdomain uses.
 *
 * ## The envelope
 *
 * Every success response is `{"kind": "<type>", "data": [...]}` — **always an
 * array**, even for a "get one thing" endpoint. {@link WrikeClient.list}
 * returns the array; {@link WrikeClient.one} returns its first element and
 * throws if the array came back empty (which only happens for a since-deleted
 * id slipping past Wrike's own 404 handling).
 *
 * ## Errors
 *
 * Every failure is `{"error": "<code>", "errorDescription": "<text>"}` with a
 * 4xx/5xx status (confirmed live: an invalid token on `/version` answers
 * `401 {"error":"not_authorized","errorDescription":"Access token is unknown
 * or invalid"}`). `error` is a small closed enum
 * (`invalid_request` / `invalid_parameter` / `parameter_required` /
 * `not_authorized` / `access_forbidden` / `not_allowed` / `resource_not_found`
 * / `method_not_found` / `too_many_requests` / `rate_limit_exceeded` /
 * `server_error`) and is surfaced verbatim by {@link formatWrikeError}.
 *
 * ## Rate limits
 *
 * Documented as a flat 400 requests/minute per IP or access token, enforced by
 * `429 too_many_requests` / `429 rate_limit_exceeded`. No response header
 * carries a remaining count — see `health/quota.ts`.
 */

/** The three data-center hosts Wrike documents as `servers` on every endpoint. */
export const WRIKE_HOSTS = ["www.wrike.com", "app-eu.wrike.com", "app-us2.wrike.com"] as const;
export type WrikeHost = typeof WRIKE_HOSTS[number];

export const API_PREFIX = "/api/v4";

export type QueryValue = string | number | boolean | undefined | null | unknown[] | object;

export interface RequestOptions {
  method?: string;
  /**
   * Every field the vendor's OpenAPI documents, scalar or structured alike.
   * Structured values are JSON-encoded by {@link buildQuery} — see the module
   * doc's "Every request body is a query string" section.
   */
  query?: Record<string, QueryValue>;
}

interface WrikeErrorBody {
  error?: string;
  errorDescription?: string;
}

/** Wrike's envelope: `{"kind": "...", "data": [...]}`. */
export interface WrikeEnvelope<T> {
  kind?: string;
  data?: T[];
}

/**
 * Read the regional host off the Connection's redacted `display` data — never
 * from the credential, which only `sign` may touch.
 *
 * `afterConnect` in `auth/permanent-token.ts` is what puts it there. A missing
 * value means the connection predates that field or was hand-crafted for a
 * test; either way there is no host to guess, so this throws with a message
 * that says how to fix it rather than silently defaulting to the US host and
 * corrupting an EU account's requests.
 */
export function hostFromConnection(connection: RedactedConnection | undefined): WrikeHost {
  const display = (connection?.display ?? {}) as { host?: string };
  const host = display.host;
  if (host && (WRIKE_HOSTS as readonly string[]).includes(host)) return host as WrikeHost;
  throw new Error(
    "Wrike connection has no valid host recorded — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(host: WrikeHost | string): string {
  return `https://${host}${API_PREFIX}`;
}

/**
 * Drop keys the caller left unset, then render every surviving value the way
 * Wrike's query-string convention expects: scalars as their string form,
 * arrays and objects as JSON.
 *
 * `false` survives distinctly from absence — `descendants=false` is a real,
 * meaningful override of Wrike's own `true` default on some endpoints — so
 * only `undefined`, `null` and `""` are treated as "not set".
 */
export function buildQuery(params: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "object") {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

/**
 * Accept a structured param (`json`-typed in the UI) as either an
 * already-parsed value or the string form a user typed by hand.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Normalise a `multiselect`-shaped param (comma string or array) into a list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Join one or many ids into the comma-separated path segment Wrike's "multi"
 * endpoints (`/tasks/{taskIds}`, `/folders/{folderIds}`, …) expect. Limit is
 * 1000 per the vendor's own docs; not enforced here since it is a natural
 * URL-length failure rather than a silent one.
 */
export function joinIds(ids: string | string[]): string {
  const list = Array.isArray(ids) ? ids : toList(ids) ?? [];
  if (list.length === 0) throw new Error("at least one id is required");
  return list.map((id) => encodeURIComponent(id)).join(",");
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Wrike's `{error, errorDescription}` body into one actionable line.
 *
 * `error` is kept verbatim because it is a small, stable, documented enum
 * (`errors-api-reference-v4`) and the fix differs per code: `not_authorized`
 * means the token or host is wrong, `not_allowed` means a license/quota limit
 * was hit rather than a permissions problem, `parameter_required` names a
 * missing field. Flattening all of these to "HTTP 400" hides which one you hit.
 */
export function formatWrikeError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: WrikeErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as WrikeErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.error) return `Wrike ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Wrike ${status} ${parsed.error} for ${method} ${path}`,
    parsed.errorDescription,
    status === 429
      ? "Wrike rate-limits at 400 requests/minute per IP or token; retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class WrikeClient {
  constructor(private ctx: HookContext, private host: WrikeHost | string) {}

  /** The envelope's `data` array — most endpoints, including "get one thing" ones. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const body = await this.send<WrikeEnvelope<T>>(path, options);
    return body.data ?? [];
  }

  /**
   * The full envelope, `kind` included. Only needed by the handful of
   * endpoints (Get Folders) whose `kind` distinguishes two documented response
   * modes; every other caller wants {@link list} or {@link one}.
   */
  envelope<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<WrikeEnvelope<T>> {
    return this.send<WrikeEnvelope<T>>(path, options);
  }

  /** The first (and expected-only) element of {@link list}. */
  async one<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const items = await this.list<T>(path, options);
    if (items.length === 0) {
      throw new Error(`Wrike returned an empty data array for ${options.method ?? "GET"} ${path}`);
    }
    return items[0];
  }

  /** Status only, for endpoints answering with no body worth reading (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.raw(path, options);
    return res.status;
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const res = await this.raw(path, options);
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  private async raw(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${baseUrl(this.host)}${path}`);
    for (const [k, v] of Object.entries(buildQuery(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatWrikeError(res.status, options.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
