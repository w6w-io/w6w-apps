import type { HookContext } from "@w6w/types";

/**
 * Hunter API v2 client.
 *
 * Verified 2026-08-29 against Hunter's own reference at
 * `hunter.io/api-documentation/v2` (a client-rendered page; the text below was
 * extracted from its rendered DOM, not guessed from a sibling integration).
 *
 * ## One host, one envelope
 *
 * Every documented endpoint lives under `https://api.hunter.io/v2`. A
 * successful response is always `{"data": ..., "meta": {...}}`; a failed one is
 * always `{"errors": [{"id", "code", "details"}, ...]}`. There is no bare-array
 * or bare-object response anywhere in the surface this app covers — unlike,
 * say, Apify, Hunter never breaks its own envelope.
 *
 * ## Endpoint slugs do not follow one convention
 *
 * Most endpoints are hyphenated (`domain-search`, `email-finder`,
 * `email-verifier`, `email-count`, `domain-finder`), but the three Enrichment
 * endpoints are nested resources instead — `people/find`, `companies/find`,
 * `combined/find` — and the Leads surface uses an underscore
 * (`leads_lists`, `leads_custom_attributes`), not a hyphen. Getting any of
 * these wrong is a 404, not a helpful redirect, so every action below spells
 * its path as a literal rather than composing it.
 *
 * ## Auth travels three ways; this app uses one
 *
 * The docs document `api_key` as a query parameter, `X-API-KEY` as a header,
 * or `Authorization: Bearer <key>`. This app signs with the query parameter —
 * it is the form used in every single example in Hunter's own reference, and
 * it means one auth method covers every GET, POST, PUT and DELETE call without
 * a header-vs-query branch. See `auth/api-key.ts`.
 *
 * ## Errors
 *
 * `{"errors": [{"id": "wrong_params", "code": 400, "details": "..."}]}`. `id`
 * is a stable machine code documented per-endpoint (`invalid_domain`,
 * `pagination_error`, `claimed_email`, ...) and is kept in the thrown message
 * because the fix differs per code.
 *
 * ## Two status codes outside the ordinary success/failure split
 *
 * `GET /email-verifier` can answer **202** while the check is still running
 * (poll again; it costs one request total, not one per poll) or **222** when
 * the remote SMTP server misbehaved in a way outside Hunter's control. Both
 * fall inside the 200–299 range `Response.ok` already treats as success, so
 * `HunterClient.raw` — not `request` — is what `actions/email-verifier.ts`
 * uses to tell them apart from a completed 200.
 *
 * ## Rate limits
 *
 * Documented per endpoint (15 req/s + 500/min for most of Finder & Verifier
 * and Enrichment, 10 req/s + 300/min for Email Verifier, 15 req/s only for
 * Email Count). No response carries a `X-RateLimit-*` header anywhere in this
 * surface — the only readable headroom is the monthly balance from
 * `GET /account` (see `health/quota.ts`).
 */

export const API_BASE = "https://api.hunter.io/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Repeated bracket-array params, e.g. `verification_status[]=valid&...=unknown`. */
  arrayQuery?: Record<string, string[] | undefined>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The `{"data": ..., "meta": {...}}` envelope every successful response carries. */
export interface HunterEnvelope<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

interface HunterErrorBody {
  errors?: Array<{ id?: string; code?: number; details?: string }>;
}

/** Drop keys the caller left unset, so an action can spread its optional inputs freely. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== "") out[key] = v;
  }
  return out;
}

/** Keep an error message readable — a validation `details` string can be long. */
export function truncate(text: string, max = 500): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Hunter's `{"errors": [...]}` body into one actionable line.
 *
 * Every entry's `id` is kept because it is the code Hunter's own
 * troubleshooting is written against (`invalid_domain`, `pagination_error`,
 * `claimed_email`, ...); a flattened "HTTP 400" hides which one fired. The
 * credential never enters this module, so nothing here can leak it.
 */
export function formatHunterError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: HunterErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HunterErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const errors = parsed?.errors;
  if (!errors || errors.length === 0) {
    return `Hunter ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const parts = errors.map((e) => `${e.id ?? "error"}${e.details ? `: ${e.details}` : ""}`);
  return truncate(`Hunter ${status} for ${method} ${path}: ${parts.join("; ")}`, 800);
}

export class HunterClient {
  constructor(private ctx: HookContext) {}

  private buildUrl(path: string, options: RequestOptions): URL {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    for (const [k, values] of Object.entries(options.arrayQuery ?? {})) {
      for (const v of values ?? []) url.searchParams.append(`${k}[]`, v);
    }
    return url;
  }

  private buildInit(options: RequestOptions): RequestInit {
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    return init;
  }

  /**
   * The full `{status, body}` pair, body unwrapped from JSON but not from the
   * `{"data", "meta"}` envelope. Needed only where a status other than a plain
   * 2xx-vs-non-2xx split matters — `actions/email-verifier.ts`'s 202 (still
   * verifying) and 222 (SMTP failure outside Hunter's control), both of which
   * fall inside the range `Response.ok`/`request` already treat as success.
   */
  async raw<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ status: number; body: HunterEnvelope<T> | null }> {
    const url = this.buildUrl(path, options);
    const res = await this.ctx.fetch(url.toString(), this.buildInit(options));
    const text = res.status === 204 ? "" : await res.text();
    const body = text ? (JSON.parse(text) as HunterEnvelope<T>) : null;
    return { status: res.status, body };
  }

  /**
   * The `{"data": ..., "meta": {...}}` envelope, verbatim, on any 2xx. Throws
   * a readable message on anything outside 200–299 (see
   * {@link formatHunterError}). `meta` carries real information most callers
   * want — result counts, `results_approximate`, pagination, aggregations,
   * an echo of the applied params — so it is never stripped.
   */
  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<HunterEnvelope<T>> {
    const url = this.buildUrl(path, options);
    const init = this.buildInit(options);
    const res = await this.ctx.fetch(url.toString(), init);
    const text = res.status === 204 ? "" : await res.text();
    if (!res.ok) {
      throw new Error(formatHunterError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return { data: undefined as T };
    return JSON.parse(text) as HunterEnvelope<T>;
  }
}
