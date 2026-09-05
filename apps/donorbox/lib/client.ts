import type { HookContext } from "@w6w/types";

/**
 * Donorbox API v1 REST client.
 *
 * Verified 2026-09-05 against Donorbox's own reference
 * (`https://raw.githubusercontent.com/donorbox/donorbox-api/master/README.md`,
 * ~17KB, hosted on the vendor's own GitHub org `donorbox/donorbox-api`) plus
 * live unauthenticated/garbage-credential probes against `donorbox.org`. That
 * repo holds no OpenAPI/Postman file — the README prose plus its worked
 * `curl` examples are the entire spec.
 *
 * ## One host, no `/data` envelope, a bare array on every list
 *
 * Every endpoint hangs off `https://donorbox.org/api/v1/...`. A list response
 * is a bare JSON array — `[{...}, {...}]` — not wrapped in `{"data": [...]}`
 * or a `{items, meta}` page envelope. Because of that, there is no
 * response-carried pagination metadata (no `total`/`last_page`) to report
 * back to a caller — only the `page`/`per_page` a caller sent.
 *
 * ## The API is read-only
 *
 * The reference documents seven `GET` endpoints (campaigns, donations, plans,
 * donors, events, tickets, purchases) and nothing else — no create, update or
 * delete verb appears anywhere in the README. This app declares only `search`
 * (list) actions; there is no write surface to add.
 *
 * ## The error body is a flat string, not a nested object
 *
 * Live, an unauthenticated or garbage-credential request answers:
 *
 *     $ curl https://donorbox.org/api/v1/campaigns
 *     HTTP/2 401
 *     {"error":"Authentication failed"}
 *
 * — `error` is a bare string, not `{error: {message}}` the way several other
 * apps in this pack shape it. `formatDonorboxError` reads that shape and
 * falls back to quoting the raw body when it doesn't parse.
 *
 * ## Real, live, IP-scoped rate-limit headers — undocumented in the README
 *
 * The reference never mentions a rate limit, but every response measured
 * live — including a 401 with an invalid Basic credential — carries
 * `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset` (a Unix
 * timestamp). Three consecutive unauthenticated requests decremented
 * `x-ratelimit-remaining` by exactly one each (60 -> 59 -> 58 -> 57) even
 * though each request used a different garbage credential, which is
 * consistent with the budget being tracked per source IP rather than per
 * credential — a working credential was not available to confirm this
 * further (Donorbox's API access costs $17/month; see `README.md`).
 * `health/quota.ts` reads these headers off the same call the Auth `test`
 * hook already makes.
 *
 * ## The `campaign_id` filter's own prose disagrees with its own example
 *
 * The README's Campaign Filters section reads: "Use `campaign_id` parameter
 * to narrow down the result by a specific campaign." immediately followed by
 * the worked example `{GET} /api/v1/campaigns?id=XX`. The prose names
 * `campaign_id`; the example sends `id`. Since a query parameter is wire
 * format and the example is what a reader would actually copy-paste, this
 * app follows the example (`id`) — see `actions/campaign-list.ts` for the
 * full note.
 */

/** The one and only documented API origin. */
export const API_BASE = "https://donorbox.org";
export const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
}

interface DonorboxErrorBody {
  error?: string;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Donorbox's error body into one actionable line. The observed shape is
 * a flat `{"error": "..."}` string — falls back to quoting the raw body
 * (typically empty or HTML) when the body doesn't parse as that shape.
 */
export function formatDonorboxError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: DonorboxErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as DonorboxErrorBody;
  } catch { /* not JSON */ }

  const message = parsed?.error;
  if (!message) {
    return `Donorbox ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
  }
  return `Donorbox ${status} for ${method} ${path}: ${message}`;
}

/** `Basic base64(email:apiKey)` — Donorbox's sole auth scheme (README "Make API calls to Donorbox"). */
export function basicHeader(email: string, apiKey: string): string {
  return `Basic ${btoa(`${email}:${apiKey}`)}`;
}

export class DonorboxClient {
  constructor(private ctx: HookContext) {}

  /** GET a bare-array list endpoint. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return [];
    return JSON.parse(text) as T[];
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatDonorboxError(res.status, "GET", url.pathname, detail));
    }
    return res;
  }
}
