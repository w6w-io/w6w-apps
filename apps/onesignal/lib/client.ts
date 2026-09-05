import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * OneSignal REST API v1 (`api.onesignal.com`, no versioned path prefix).
 *
 * Verified on 2026-09-05 against OneSignal's own OpenAPI 3.1 document
 * (`documentation.onesignal.com/openapi.json`, 1,472,928 bytes, `info.version`
 * `11.6`), the "Keys & IDs" and "REST API overview" guides, and live probes
 * against `api.onesignal.com` and `status.onesignal.com`.
 *
 * ## Two key generations — this app uses the current one
 *
 * OneSignal introduced **App API keys** and **Organization API keys**
 * (`os_v2_app_...`, named, rotatable, IP-allowlistable) in November 2024. The
 * legacy **REST API key** and **User Auth key** are "still accepted, but the
 * management UI for them has been removed and new keys cannot be created" —
 * documented verbatim in the Keys & IDs migration section. This app is built
 * only against the current App API key.
 *
 * ## App key vs Organization key — this app is App-key only
 *
 * An **App API key** is scoped to one App ID: sending messages, managing
 * Users/Subscriptions/Segments, custom events. An **Organization API key**
 * spans every app on the account and is required for a disjoint set of
 * endpoints: `GET/POST /apps` (list/create apps), `PUT /apps/{id}` (update an
 * app's platform config), all `/apps/{id}/auth/tokens` key-management routes,
 * and `/organizations/{id}/audit_logs` — verified from each operation's own
 * `Authorization` parameter description in the OpenAPI document, which
 * literally says "Your Organization API key" on those and only those. Mixing
 * the two into one Auth method would mean half this app's actions silently
 * 403 for anyone who (correctly) provisioned only an App key, so none of
 * those org-level endpoints are implemented here.
 *
 * ## Header format
 *
 * `Authorization: Key <token>` — **not** `Bearer`. Confirmed both from the
 * OpenAPI `Authorization` parameter default (`"Key YOUR_APP_API_KEY"`) on
 * every app-scoped operation and from a live unauthenticated probe against
 * `GET /apps/{app_id}/segments`, which answers
 * `401 {"errors": ["Access denied. Please include an 'Authorization: ...'
 * header with a valid API key ..."]}` for both a missing header and a
 * syntactically-plausible but wrong one — the body does not distinguish the
 * two cases, so `test()` cannot either.
 *
 * ## The App ID is not a secret, but every path needs it
 *
 * The App ID is a public UUID (safe in client-side SDK init) that almost
 * every endpoint requires in its path or query string. It travels in the
 * Connection's redacted `display` (see {@link resolveAppId}), the same
 * pattern this pack already uses for Algolia's per-account hostname.
 *
 * ## Error envelope is not one shape
 *
 * Documented directly in `components.schemas.BasicErrorResponse`: most
 * endpoints answer `{"errors": ["human sentence", ...]}`, some additionally
 * set `"success": false`, and a few (400s on segments/journeys validation)
 * answer the coded `{"errors": [{"code", "title", "meta"}]}` form instead.
 * {@link formatOneSignalError} handles both without assuming one.
 *
 * ## `content-type: text/plain` on a JSON body
 *
 * Measured live: an error response from `api.onesignal.com` (a 401 with a
 * `{"errors": [...]}` body) is served as `content-type: text/plain`, not
 * `application/json`. Parsing strictly on content type would treat a real,
 * well-formed error body as unparseable; this client parses the text as JSON
 * regardless of the declared type and falls back to the raw string only if
 * that fails.
 *
 * ## Rate limits — no readable remaining count
 *
 * Per-endpoint ceilings are fixed by plan (documented in `/reference/rate-limits`,
 * e.g. 150 or 6,000 req/sec/app for Create/Cancel message) and refused with a
 * `429 {"errors": ["API rate limit exceeded."]}`. No response — success or
 * error — carries an `X-RateLimit-*` header of any kind; the only signal is
 * the `429` itself. See `health/quota.ts`.
 */

export const API_BASE = "https://api.onesignal.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

interface ErrorItem {
  code?: string;
  title?: string;
  meta?: unknown;
}

interface OneSignalErrorBody {
  errors?: Array<string | ErrorItem>;
  success?: boolean;
}

/** Public (redacted-safe) connection metadata this app records via `afterConnect`. */
export interface OneSignalConnectionDisplay {
  /** The OneSignal App ID (UUID v4) — not a secret, but required on almost every path. */
  appId?: string;
}

/** Resolve the App ID from the Connection's public metadata. Actions cannot build a URL without it. */
export function resolveAppId(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as OneSignalConnectionDisplay;
  const appId = display.appId?.trim();
  if (!appId) {
    throw new Error(
      "OneSignal connection records no App ID — reconnect so one can be recorded.",
    );
  }
  return appId;
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Accept a `json`/`multiselect`-shaped param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Normalise a `multiselect`/comma-list param into a string array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can carry many entries. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn OneSignal's error body into one actionable line.
 *
 * Handles both documented shapes: a flat array of human-readable strings, and
 * the coded `{code, title, meta}` form some validation errors use. `content-type`
 * is ignored on purpose — see the header doc above.
 */
export function formatOneSignalError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: OneSignalErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as OneSignalErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const errors = parsed?.errors;
  if (!errors || errors.length === 0) {
    return `OneSignal ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const lines = errors.map((e) =>
    typeof e === "string" ? e : [e.code, e.title].filter(Boolean).join(": ") || JSON.stringify(e)
  );
  return truncate(`OneSignal ${status} for ${method} ${path}: ${lines.join("; ")}`);
}

/**
 * Fields on the `GET /apps/{app_id}` response that carry live push
 * credentials, and are therefore deleted before `actions/view-app.ts` returns
 * anything.
 *
 * This is not tidiness — each is a working credential the vendor returns
 * inside an otherwise ordinary configuration read:
 *
 *  - `fcm_v1_service_account_json` is the **entire Firebase service-account
 *    private key**, capable of sending Android push (and more, depending on
 *    the service account's own IAM roles) on this app's behalf.
 *  - `apns_p8` is Apple's private signing key for APNs token-based auth.
 *  - `apns_certificates` / `safari_apns_certificate` are the app's APNs
 *    client certificates (private key + cert, PEM-encoded).
 *  - `gcm_key` is the **legacy** GCM/FCM server key — the vendor's own schema
 *    marks it deprecated, but a deprecated credential is still a live one
 *    until rotated.
 *
 * A workflow step's result is persisted in the run record and routinely
 * echoed into logs and previews, so returning any of these would turn one
 * read into a durable credential leak — the same trap Apify's `/users/me`
 * sets with `proxy.password` (see that app's `lib/client.ts`). The values
 * remain visible to their owner in the OneSignal dashboard; nothing else
 * about the response is altered here.
 */
export const REDACTED_APP_FIELDS = [
  "gcm_key",
  "fcm_v1_service_account_json",
  "chrome_key",
  "apns_certificates",
  "apns_p8",
  "safari_apns_certificate",
] as const;

/** Remove {@link REDACTED_APP_FIELDS} from an app object, returning a shallow copy. */
export function stripAppSecrets<T>(app: T): T {
  if (!app || typeof app !== "object" || Array.isArray(app)) return app;
  const out: Record<string, unknown> = { ...(app as Record<string, unknown>) };
  for (const field of REDACTED_APP_FIELDS) delete out[field];
  return out as T;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
}

export class OneSignalClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body. Returns `undefined` for a 204/empty body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`OneSignal returned an unparseable body for ${path}: ${truncate(text)}`);
    }
  }

  /** Status only — for `DELETE` endpoints that answer with no useful body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatOneSignalError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
