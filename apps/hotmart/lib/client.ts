import type { HookContext } from "@w6w/types";

/**
 * Hotmart Public API client.
 *
 * Everything in this module was verified on 2026-09-05 against Hotmart's own
 * developer documentation (`developers.hotmart.com/docs/en/...`, a Gatsby
 * site whose page data is served as structured JSON — read directly rather
 * than screen-scraped) and against live, **unauthenticated** probes of the
 * hosts below. No detail came from a sibling integration or from Hotmart's
 * marketing site.
 *
 * ## The docs host IS the API host — verified, not assumed
 *
 * Every code sample across Hotmart's docs (sales, subscriptions, products,
 * coupons, user) targets `https://developers.hotmart.com/...`, the same host
 * that serves the documentation pages. That reads like a docs-site artifact
 * (a placeholder domain never meant to be called directly), so it was
 * checked live rather than trusted:
 *
 *   | Path                                    | Status | Body                                          |
 *   | ---------------------------------------- | ------ | ---------------------------------------------- |
 *   | `/payments/api/v1/sales/history`         | 401    | `{"error":"unauthorized","error_description":"Full authentication is required..."}` |
 *   | `/user/api/v1/me`                        | 401    | `{"error":"invalid_token","error_description":"Access token is missing or invalid..."}` |
 *   | `/definitely-not-a-real-path-zzz`        | 200    | Gatsby SPA shell, `<meta http-equiv="refresh" content="0; URL='.../404/...'">` |
 *
 * The two real, documented paths answer with a schema-correct, endpoint-
 * specific JSON error and a 401 — proof of a live API behind them. The
 * nonsense path answers 200 with the docs site's own catch-all shell. That
 * contrast is what rules out "this is just the docs site echoing itself."
 *
 * ## Two hosts, not one
 *
 * `api-sec-vlc.hotmart.com` is a **separate** host, used only for the OAuth
 * token exchange (`security/oauth/token`). Every resource endpoint (sales,
 * subscriptions, products, coupons, user) lives on `developers.hotmart.com`.
 * Both were confirmed live and unauthenticated-reachable on 2026-09-05.
 *
 * ## Auth is client_credentials wrapped in a second secret
 *
 * Generating a Hotmart Developer Credential produces **three** pieces:
 * `client_id`, `client_secret`, and a third opaque value literally called
 * "token of the Basic type". The token endpoint wants all three at once —
 * `client_id`/`client_secret` as query parameters *and* the Basic token as
 * an `Authorization: Basic <token>` header — which is not the plain
 * `base64(client_id:client_secret)` a textbook client_credentials grant
 * would construct from the other two. See `auth/client-credentials.ts`.
 *
 * ## One error envelope
 *
 * Every documented failure is `{"error", "error_description", "error_uri"?}`
 * (occasionally `error_url` on older pages) with a 4xx/5xx status. `error` is
 * a stable machine code (`invalid_token`, `token_expired`, `unauthorized`,
 * `unauthorized_client`, `not_found`, `invalid_parameter`, plus endpoint-
 * specific ones like `purchase_not_found` and `it_can_not_cancel_subscription_status`)
 * and is surfaced verbatim by {@link formatHotmartError}, because a flattened
 * "HTTP 401" hides which of "no token", "expired token" or "wrong scope" it was.
 *
 * ## Pagination
 *
 * Cursor-based: `page_token` in, `page_info.next_page_token` /
 * `prev_page_token` out, alongside `results_per_page` and (on most, not all,
 * endpoints) `total_results`. `max_results` caps the page size; each endpoint
 * has its own default and ceiling that the vendor does not publish uniformly,
 * so this app never assumes one.
 *
 * ## Rate limits
 *
 * Documented as 500 requests/minute (read + write combined), with
 * `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` plus the
 * legacy `X-RateLimit-Limit-Minute` / `X-RateLimit-Remaining-Minute` headers
 * on responses. These headers were **not observed** on the unauthenticated
 * 401 probes above (Hotmart appears to only attach them to a fully
 * authenticated call), so `health/quota.ts` treats their absence as
 * `unknown`, never as zero headroom.
 */

/** Every resource endpoint (sales, subscriptions, products, coupons, user) lives here. */
export const API_BASE = "https://developers.hotmart.com";

/** The OAuth token endpoint lives on a different host entirely. */
export const TOKEN_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";

export const PAYMENTS_PREFIX = "/payments/api/v1";
export const PRODUCTS_PREFIX = "/products/api/v1";
export const USER_PREFIX = "/user/api/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Hotmart's cursor-based pagination envelope, alongside `items`. */
export interface HotmartPageInfo {
  total_results?: number;
  next_page_token?: string;
  prev_page_token?: string;
  results_per_page?: number;
}

export interface HotmartListPage<T> {
  items: T[];
  page_info?: HotmartPageInfo;
}

interface HotmartErrorBody {
  error?: string;
  error_description?: string;
  error_uri?: string;
  error_url?: string;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — several Hotmart
 * booleans (`send_mail`, `charge`, `trial`) are meaningful at `false`, and a
 * numeric `0` (`discount`, `affiliate`) is a legal value.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Normalise a `multiselect`-shaped param (Hotmart's repeated `status=`/`plan=`
 * query keys) into a plain string array.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Hotmart's `{error, error_description}` body into one actionable line.
 *
 * `error` is kept because Hotmart's own troubleshooting docs are written
 * against it: `invalid_token` (no/garbled token), `token_expired` (stale
 * token — reconnect), `unauthorized_client` (token is fine, scope isn't) and
 * a long tail of endpoint-specific codes (`purchase_not_found`,
 * `it_can_not_cancel_subscription_status`, `subscription_in_trial_period`)
 * are different problems with different fixes, and all collapse to a bare
 * 400/401/403/404 without it.
 */
export function formatHotmartError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: HotmartErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HotmartErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.error) return `Hotmart ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Hotmart ${status} ${parsed.error} for ${method} ${path}`,
    parsed.error_description,
    status === 429
      ? "Hotmart allows 500 requests/minute (read + write combined); retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class HotmartClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. Used by every action — every documented endpoint answers JSON. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
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
        // Hotmart reads a multi-valued filter (`status`, `plan`) as the SAME
        // query key repeated, not as one comma-joined value — confirmed by
        // the documented example `?status=CANCELLED_BY_SELLER&status=ACTIVE`.
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
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
      throw new Error(formatHotmartError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
