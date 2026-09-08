import type { HookContext } from "@w6w/types";

/**
 * WebinarGeek REST API v2 client.
 *
 * Every path, verb, query parameter and body field in this app was verified 2026-09-06 against
 * the vendor's own API Blueprint document — fetched from `https://jsapi.apiary.io/apis/
 * webinargeek.apib` (the raw source Apiary serves behind its `webinargeek.docs.apiary.io`
 * rendered docs page, itself reached by a `308`/`301` redirect chain starting at
 * `https://www.webinargeek.com/api/`) — plus live, unauthenticated and bogus-token probes
 * against `app.webinargeek.com`.
 *
 * ## One header, one host, no OAuth
 *
 * WebinarGeek authenticates every request with a single account-wide API key sent as an
 * `Api-Token` header (NOT `Authorization`, with no scheme prefix) — see `auth/api-key.ts`. The
 * key is minted per-account (Advanced → API in the account settings) and is not scoped, so
 * `network.allow` needs only the one host every documented path hangs off:
 * `https://app.webinargeek.com/api/v2`.
 *
 * A live, unauthenticated probe confirms the host answers with the vendor's own documented
 * error envelope rather than a generic SPA 200 — and a syntactically well-formed but wrong key
 * gets the IDENTICAL body, so a caller cannot distinguish "no key" from "bad key" from the
 * response alone:
 *
 * ```
 * GET https://app.webinargeek.com/api/v2/account   (no Api-Token header)
 * -> HTTP 401 {"code":"unauthorized","message":"Key is not provided or does not exists"}
 *
 * GET https://app.webinargeek.com/api/v2/account   (Api-Token: bogus-token-12345)
 * -> HTTP 401 {"code":"unauthorized","message":"Key is not provided or does not exists"}
 * ```
 *
 * ## Two date formats coexist in the same API
 *
 * Nearly every timestamp field in this API — `created_at`, `date`, `watch_start`, `unsubscribed_at`,
 * etc. — is a Unix timestamp (integer seconds, UTC), per the spec's own "Dates and times" section.
 * But two places break that rule: the `subscriptions` list's `watch_end_from`/`watch_end_to`
 * filters take an ISO-8601 string (`2024-01-15T00:00:00Z`), and creating a broadcast
 * (`POST /episodes/{id}/broadcasts`) takes an ISO-8601 `date` with a UTC offset
 * (`2025-07-09T14:30:00+02:00`) rather than an epoch integer. Both are passed through here
 * exactly as the vendor documents them — converting one format into the other would silently
 * send the wrong value.
 *
 * ## Pagination is uniform, but the ceiling changed
 *
 * Every list endpoint takes the same `page` (1-indexed) / `per_page` pair and returns the same
 * `{ total_count, <resource>: [...], pages: { next, page, per_page, total_pages } }` envelope —
 * unlike many vendors in this pack, WebinarGeek does not vary the page-size parameter name per
 * resource. The one thing to know: `per_page`'s maximum was raised from 100 to 1000 on
 * 2023-05-22 (per the spec's own changelog), so an integration written against the old ceiling
 * silently caps itself well below what the API now allows.
 *
 * ## Errors are one shape everywhere
 *
 * `{"code": "<snake_case_code>", "message": "<human text>"}` on every documented error status
 * (400/401/403/404/409/422/429/500/503) — {@link formatWebinarGeekError} reads it and falls back
 * to a raw-body message when a response is not that shape (a 5xx from an edge/proxy, say).
 */

/** The one host every documented endpoint (and the credential probe) hangs off. */
export const API_HOST = "app.webinargeek.com";

/** WebinarGeek REST API v2 — verified `HOST` directive from the vendor's own API Blueprint. */
export const API_URL = `https://${API_HOST}/api/v2`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset, so an optional filter isn't sent as a literal `undefined`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

interface WebinarGeekErrorBody {
  code?: string;
  message?: string;
}

/**
 * Turn a WebinarGeek API error into one actionable line.
 *
 * `code` is the vendor's own stable machine code (`not_found`, `bad_request`, `conflict_error`,
 * `unprocessable_entity`, `unauthorized`, and others this app has not enumerated because they
 * were never observed live) — kept verbatim, since it is a different, more specific problem than
 * a bare HTTP status.
 */
export function formatWebinarGeekError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: WebinarGeekErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as WebinarGeekErrorBody;
  } catch {
    // not JSON — fall through to the raw body
  }
  if (!parsed?.code && !parsed?.message) {
    return `WebinarGeek ${status} for ${method} ${path}: ${raw.slice(0, 500)}`;
  }
  const parts = [
    `WebinarGeek ${status}${parsed.code ? ` ${parsed.code}` : ""} for ${method} ${path}`,
    parsed.message,
  ].filter(Boolean);
  return parts.join(": ");
}

/** The `pages` block shared by every `GET` collection endpoint's response envelope. */
export interface WebinarGeekPages {
  next: string | null;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets the `Api-Token` header — the runtime routes every
 * request through the auth `sign` hook, exactly as for every other app in this pack.
 */
export class WebinarGeekClient {
  constructor(private ctx: HookContext) {}

  /** Parses and returns the JSON body (or `undefined` for a 204/empty response). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_URL}${path}`);
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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatWebinarGeekError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
