import type { HookContext } from "@w6w/types";

/**
 * Quo (formerly OpenPhone) Public API v1 REST client.
 *
 * Verified 2026-08-30 against Quo's own machine-readable OpenAPI document
 * (`openphone-public-api-prod.s3.us-west-2.amazonaws.com/public/openphone-public-api-v1-prod.json`,
 * `info.title` "Quo Public API", linked from `www.quo.com/docs/mdx/guides/building-with-ai-llms`)
 * plus Quo's hand-written docs (`www.quo.com/docs/mdx/api-reference/*`) and live probes against
 * `api.quo.com`. Nothing here came from a third-party integration directory.
 *
 * ## The rebrand reaches the API host itself
 *
 * OpenPhone rebranded to Quo. `openphone.com` 301s to `quo.com` and `api.openphone.com` still
 * answers (identical body, identical behavior — both hosts sit behind the same backend, measured
 * live) — but the OpenAPI document's own `servers[0].url` is `https://api.quo.com`, and every code
 * sample in Quo's current docs (`send-your-first-message`, the contact-sync guide) calls
 * `api.quo.com`, not the legacy host. This app calls `api.quo.com` as the vendor's own
 * current-and-documented host; `api.openphone.com` is not declared in `network.allow` since no
 * action calls it.
 *
 * ## No Bearer prefix
 *
 * Quo's own auth guide is explicit: "The Quo API does not use a Bearer token for authentication."
 * — `Authorization: YOUR_API_KEY`, the raw key, no prefix (confirmed by the OpenAPI security
 * scheme too: `{"type": "apiKey", "in": "header", "name": "Authorization"}`, no `scheme`/prefix
 * field at all).
 *
 * ## The error envelope Quo actually returns is NOT the one its own OpenAPI document describes
 *
 * The OpenAPI document's per-status response schemas all describe
 * `{message, code, status, docs, title, trace?, errors?}`. Live probes against `api.quo.com`
 * (unauthenticated and with a syntactically-plausible fake key) both return a **different**,
 * undocumented shape instead: `{"error": {"message": "...", "key": "Unauthorized", "trace":
 * "..."}}` — e.g. `{"error":{"message":"Missing authorization header","key":"Unauthorized",
 * "trace":"..."}}` with no credential at all, vs `{"error":{"message":"Unauthorized","key":
 * "Unauthorized","trace":"..."}}` for a wrong one. Unlike some vendors in this pack, Quo DOES word
 * the two cases differently even though both are a 401 with the same `key`. This client parses the
 * envelope actually observed on the wire, not the documented one — see
 * {@link formatQuoError}. A route that does not exist at all (no auth check reached) answers a
 * bare Express HTML 404, not JSON — handled by falling back to the truncated raw body.
 *
 * ## Pagination is cursor-based, and the envelope is not uniform
 *
 * List endpoints take `maxResults` (required on `calls`/`messages`/`contacts`/`conversations`,
 * optional on `users`; absent entirely on `phone-numbers`/`webhooks`/`contact-custom-fields`, which
 * return their full `data` array unpaginated) and an opaque `pageToken`; the response is
 * `{data, totalItems, nextPageToken}` — `nextPageToken` is `null` at the end, per the API's own
 * 1.1.2 changelog entry fixing an earlier string-token bug. **Every other successful response is
 * `{"data": <resource>}`, except the three conversation `mark-as-*` actions, which return the
 * updated conversation object directly with NO `data` wrapper** — verified against the OpenAPI
 * document's own response schema for those three paths, not assumed from the list-shaped ones.
 *
 * ## Rate limit: 10 requests/second per API key
 *
 * Quo documents a flat ceiling with no response header exposing remaining headroom — see
 * `health/quota.ts` for why that check is a declared absence.
 */

export const API_BASE = "https://api.quo.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface QuoErrorEnvelope {
  error?: { message?: string; key?: string; trace?: string };
}

/** Keep an error message readable. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Quo's actually-observed `{"error": {"message", "key", "trace"}}` envelope into one
 * actionable line. Falls back to the raw body when the response isn't JSON at all (an unmatched
 * route answers a bare Express HTML 404 — see this file's header comment).
 */
export function formatQuoError(status: number, method: string, path: string, raw: string): string {
  let parsed: QuoErrorEnvelope | null = null;
  try {
    parsed = JSON.parse(raw) as QuoErrorEnvelope;
  } catch { /* not JSON — an unmatched route's Express HTML 404, or a proxy error page */ }

  const err = parsed?.error;
  const base = `Quo ${status} for ${method} ${path}`;
  const parts = [
    base,
    err?.message
      ? (err.key && err.key !== err.message ? `${err.key}: ${err.message}` : err.message)
      : (raw ? truncate(raw) : undefined),
    status === 429 ? "rate limit exceeded — Quo allows 10 requests/second per API key" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export interface RateLimit {
  /** Requests remaining in the current window (`ratelimit`'s `r`). */
  remaining?: number;
  /** Seconds until the window resets (`ratelimit`'s `t`). */
  resetsIn?: number;
  /** The window's total allowance (`ratelimit-policy`'s `q`). */
  quota?: number;
  /** Window length in seconds (`ratelimit-policy`'s `w`). */
  window?: number;
}

/**
 * Parse Quo's rate-limit headers — the IETF IETF `ratelimit`/`ratelimit-policy` structured-field
 * draft, e.g. `ratelimit: "per-second"; r=9; t=1` and `ratelimit-policy: "per-second"; q=10; w=1`
 * (measured live 2026-08-30, present on both a 401 and a 200). Not `X-RateLimit-*` — a client
 * looking for the conventional headers finds none.
 */
export function parseRateLimit(limitHeader: string | null, policyHeader: string | null): RateLimit {
  const read = (header: string | null, key: string): number | undefined => {
    if (!header) return undefined;
    const match = new RegExp(`(?:^|;)\\s*${key}=(\\d+)`).exec(header);
    return match ? Number(match[1]) : undefined;
  };
  return {
    remaining: read(limitHeader, "r"),
    resetsIn: read(limitHeader, "t"),
    quota: read(policyHeader, "q"),
    window: read(policyHeader, "w"),
  };
}

/** Append a query param, repeating the key for each array element (never `key[]=`). */
function appendQuery(url: URL, key: string, value: QueryValue): void {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const v of value) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(key, String(v));
    }
    return;
  }
  url.searchParams.set(key, String(value));
}

export class QuoClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. Callers unwrap `data` themselves — the envelope isn't uniform. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) appendQuery(url, k, v);

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatQuoError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
