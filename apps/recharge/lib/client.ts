import type { HookContext } from "@w6w/types";

/**
 * Recharge Payments API v2021-11 REST client (`api.rechargeapps.com`).
 *
 * Verified 2026-09-05 against Recharge's own API reference
 * (`developer.getrecharge.com`, a Nuxt-rendered reference whose version
 * selector offers exactly two entries — `2021-01` and `2021-11`, with
 * `2021-11` selected by default and its own release notes linked from the
 * "Versioning" section) plus live probes against `api.rechargeapps.com`.
 * Nothing here came from a third-party integration directory.
 *
 * ## Base URL and version pinning
 *
 * The reference's own "Base URL" panel states `https://api.rechargeapps.com`
 * verbatim, and every curl example in the doc sends
 * `X-Recharge-Version: 2021-11` explicitly rather than relying on the
 * store's account-level default (the "Versioning" section: "All requests
 * will use your account API settings, unless you send a
 * `X-Recharge-Version` header to specify the version"). This client always
 * sends that header for the same reason the doc's own examples do — a
 * store's default version is store configuration this app has no way to
 * read, and an unpinned request would silently drift onto whatever that
 * default resolves to. Confirmed live: an unauthenticated request with no
 * version header answers with `x-recharge-version: 2021-01` — one version
 * *older* than current — which is exactly the drift pinning avoids.
 *
 * ## Auth header, not Bearer
 *
 * `X-Recharge-Access-Token: <token>` — confirmed both from the reference's
 * "Authentication" section and from a live probe: an unauthenticated
 * `GET /token_information` and one signed with a syntactically-plausible
 * fake token both answer `401 {"error":"bad authentication"}` (measured
 * 2026-09-05). There is no `Authorization: Bearer` form documented or
 * observed. See `auth/api-token.ts`.
 *
 * ## Envelope: one resource-named key, not a fixed wrapper
 *
 * Unlike vendors that wrap every response in a fixed `{"data": …}` envelope,
 * Recharge wraps each response under a key named after the RESOURCE:
 * `{"customer": {…}}` for a single customer, `{"customers": […]}` for a
 * list. `single()` and `list()` below take that key as a parameter rather
 * than assuming one shape fits every endpoint.
 *
 * ## Cursor pagination, not page numbers
 *
 * "Starting with the 2021-11 version of the API, you will not be able to
 * retrieve a count of total records for a given GET request" — list
 * endpoints return `next_cursor` / `previous_cursor` instead, and `page` is
 * documented `*Deprecated` on every list endpoint checked (still capped at
 * page 100). This app only ever paginates by cursor.
 *
 * ## Two error shapes, not one
 *
 * Confirmed by reading the reference's embedded example-response data (its
 * per-status `json_example` fields) for several endpoints:
 *
 *  - `401` / `404` answer `{"error": "<string>"}` — a bare string, e.g.
 *    `{"error": "bad authentication"}` (measured live) or
 *    `{"error": "address not found"}` (documented example).
 *  - `422` answers `{"errors": {"<field>": ["<message>", …]}}` — a
 *    Rails-style validation error keyed by field name.
 *
 * `formatRechargeError` below reads both shapes rather than assuming
 * either.
 *
 * ## Rate limiting: real, but undocumented in shape
 *
 * The reference states in prose that "some of our API resources and
 * endpoints may be limited" and its own code samples `sleep(1)` between
 * calls, but nowhere states a header name. A live probe found one anyway:
 * every response — success or 401 — carries `x-recharge-limit: <used>/<cap>`,
 * confirmed incrementing across three consecutive requests
 * (`1/40`, `2/40`, `3/40`, measured 2026-09-05). `health/quota.ts` reads it.
 */

export const API_BASE = "https://api.rechargeapps.com";

/** Pinned so behaviour never depends on a store's own default-version setting. */
export const API_VERSION = "2021-11";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface RechargeListPage<T> {
  items: T[];
  nextCursor?: string;
  previousCursor?: string;
}

/** `{"error": "<string>"}` — the shape of a 401/404. */
interface RechargeSingleErrorBody {
  error?: string;
}

/** `{"errors": {"<field>": ["<message>", …]}}` — the shape of a 422. */
interface RechargeFieldErrorBody {
  errors?: Record<string, string[] | string>;
}

/**
 * Drop keys the caller left unset. Generic over its input so the result stays
 * assignable to `RequestOptions.query` (`Record<string, QueryValue>`) or to a
 * request body, whichever the caller built.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/** Keep an error message readable — a field-error body can carry many entries. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Recharge's error body into one readable line, reading both documented
 * shapes rather than assuming either.
 */
export function formatRechargeError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (RechargeSingleErrorBody & RechargeFieldErrorBody) | null = null;
  try {
    parsed = JSON.parse(raw) as RechargeSingleErrorBody & RechargeFieldErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (parsed?.errors && typeof parsed.errors === "object") {
    const fields = Object.entries(parsed.errors)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join("; ") : msgs}`)
      .join(" | ");
    return truncate(`Recharge ${status} for ${method} ${path}: ${fields}`);
  }
  if (typeof parsed?.error === "string") {
    return `Recharge ${status} for ${method} ${path}: ${parsed.error}`;
  }
  if (status === 429) {
    return `Recharge ${status} for ${method} ${path}: rate limited — see the x-recharge-limit header`;
  }
  return truncate(`Recharge ${status} for ${method} ${path}: ${raw}`);
}

export class RechargeClient {
  constructor(private ctx: HookContext) {}

  /** Unwrap a single-resource response, e.g. `{"customer": {…}} -> {…}`. */
  async single<T>(path: string, key: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<Record<string, unknown>>(path, options);
    return body[key] as T;
  }

  /** Unwrap a list response, keeping the cursor pair alongside the items. */
  async list<T>(
    path: string,
    key: string,
    options: RequestOptions = {},
  ): Promise<RechargeListPage<T>> {
    const body = await this.json<Record<string, unknown>>(path, options);
    const items = body[key];
    return {
      items: Array.isArray(items) ? items as T[] : [],
      nextCursor: typeof body.next_cursor === "string" && body.next_cursor
        ? body.next_cursor
        : undefined,
      previousCursor: typeof body.previous_cursor === "string" && body.previous_cursor
        ? body.previous_cursor
        : undefined,
    };
  }

  /** Parsed JSON body, envelope intact. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer 204 with no body (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "x-recharge-version": API_VERSION,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatRechargeError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
