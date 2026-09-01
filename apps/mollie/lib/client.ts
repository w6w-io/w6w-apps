import type { HookContext } from "@w6w/types";

/**
 * Mollie API v2 REST client (`api.mollie.com/v2`).
 *
 * Every path, verb, request/response field and error shape in this app was
 * verified on 2026-09-01 against Mollie's own machine-readable OpenAPI 3.1
 * documents — the reference at `docs.mollie.com` embeds a separate OAS
 * document per doc *category* (`"Accepting payments"`, `"Recurring"`,
 * `"Mollie Connect"`, …) rather than one combined file — cross-checked
 * against the prose guide pages fetched alongside them, and live probes
 * against `api.mollie.com` and `status.mollie.com`.
 *
 * ## Amounts are exact decimal STRINGS, never integer cents
 *
 * Unlike many payment APIs (Razorpay, Stripe), Mollie represents every
 * monetary amount as `{currency: "EUR", value: "10.00"}` — `value` is a
 * STRING with the currency's natural number of decimal places, not an
 * integer count of the smallest sub-unit. A naive `Math.round(amount * 100)`
 * integer-cents conversion is simply the wrong shape here, not just wrong by
 * a factor of 100. `lib/params.ts`'s amount fields collect `value` as a
 * string for exactly this reason.
 *
 * ## List responses are HAL+JSON, keyed by resource name under `_embedded`
 *
 * Every list endpoint answers `{count, _embedded: {<resourceKey>: [...]}, _links}`
 * — e.g. `GET /payments` nests its array under `_embedded.payments`, `GET
 * /customers` under `_embedded.customers`. `unwrapList` below does that
 * extraction so every list action shares one implementation.
 *
 * ## The error envelope is uniform — `{status, title, detail, field?, _links}`
 *
 * Every error response (verified live and against `overview/handling-errors`)
 * is `{"status": 400, "title": "...", "detail": "...", "field"?: "...",
 * "_links": {"documentation": {...}}}`. `formatMollieError` below builds one
 * readable line from it.
 *
 * ## The docs promise 401 for a bad credential; live traffic answers 400
 *
 * `overview/handling-errors` shows a worked example of a bad API key
 * returning `401 Unauthorized Request` / `"Missing authentication, or failed
 * to authenticate"`. Measured live on 2026-09-01, **every** credential
 * problem this app could provoke from the outside — no `Authorization`
 * header at all, a syntactically-plausible-but-wrong `live_`/`test_` key, a
 * header with no `Bearer ` prefix — answers `400 Bad Request` /
 * `"Invalid Authorization header"` instead, not the documented 401. A
 * gateway in front of the API is rejecting the header's *shape* before
 * authentication logic ever runs. `auth/bearer.ts`'s `test` hook handles
 * both: a `400` with that exact `detail` is "no usable credential reached
 * the request", any other `4xx` is "the request was rejected", classified by
 * body content, never by assuming which status a name implies.
 */

/** The one and only API origin every category's OpenAPI document declares. */
export const API_BASE = "https://api.mollie.com/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface MollieErrorBody {
  status?: number;
  title?: string;
  detail?: string;
  field?: string;
  _links?: { documentation?: { href?: string } };
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Keep an error message readable — a `detail` can be a long validation sentence. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Turn Mollie's `{status, title, detail, field}` error body into one actionable line. */
export function formatMollieError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: MollieErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as MollieErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.title && !parsed?.detail) {
    return `Mollie ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Mollie ${status} ${parsed.title ?? "error"} for ${method} ${path}`,
    parsed.detail,
    parsed.field ? `field: ${parsed.field}` : undefined,
    status === 429 ? "rate limit exceeded; check Retry-After and back off" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(" — "), 1000);
}

/** A Mollie list envelope: `{count, _embedded: {<key>: T[]}, _links}`. */
export interface MollieList<T> {
  count?: number;
  _embedded?: Record<string, T[]>;
  _links?: Record<string, { href?: string } | undefined>;
}

/** Pull the array out of `_embedded.<resourceKey>`, defaulting to `[]` when absent. */
export function unwrapList<T>(body: MollieList<T>, resourceKey: string): T[] {
  return body._embedded?.[resourceKey] ?? [];
}

export class MollieClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "DELETE", body });
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
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
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatMollieError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
