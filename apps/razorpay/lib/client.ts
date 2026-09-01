import type { HookContext } from "@w6w/types";

/**
 * Razorpay API v1 REST client (`api.razorpay.com/v1`).
 *
 * Everything in this module was verified on 2026-09-01 against Razorpay's own
 * machine-readable OpenAPI 3.0 document (`razorpay.com/openapi.json`, 402,421
 * bytes, `info.version` `1.0.0`), cross-checked against the prose docs it is
 * generated alongside (`razorpay.com/docs/api/**`, fetched as raw Markdown via
 * the `.md` suffix Mintlify serves), and live probes against `api.razorpay.com`.
 *
 * ## One host, one flat namespace, no envelope
 *
 * Unlike many APIs in this pack, Razorpay does not wrap a single-entity
 * response in a `{"data": …}` envelope — `GET /v1/payments/{id}` answers the
 * `Payment` object directly. Only a **list** response is wrapped, and always
 * the same shape: `{"entity": "collection", "count": N, "items": [...]}`.
 *
 * ## Errors are one consistent envelope, but the `code` does not disambiguate
 *
 * Every failure is `{"error": {"code", "description", "source"?, "step"?,
 * "reason"?, "field"?, "metadata"?}}`. The catch: **every authentication
 * failure carries the same `code` — `BAD_REQUEST_ERROR`** — whether the
 * credential is missing, malformed, or simply wrong. The only thing that
 * differs is `description`:
 *
 *  - No `Authorization` header at all: `"Please provide your api key for
 *    authentication purposes"` (verified live, 401).
 *  - Any other credential problem (wrong secret, garbage key, malformed
 *    `Basic` header): `"Authentication failed"` (verified live, 401).
 *
 * So `auth/basic.ts` matches on `description`, not `code` — matching on the
 * error code alone cannot tell "the connection lost its credential" from "the
 * credential is wrong".
 *
 * ## Amounts are integers in the smallest currency sub-unit — with two exceptions
 *
 * Every `amount` field is documented as an integer count of the smallest
 * currency sub-unit: paise for INR (`50000` = ₹500). The OpenAPI document
 * states two exceptions in the `PaymentLink.amount` description, verbatim:
 * three-decimal currencies (KWD, BHD, OMR) drop the last decimal digit
 * (295.991 KWD → 295990), and zero-decimal currencies (JPY) are passed as-is.
 * Every amount `Param` in this app repeats that rule in its `hint` rather than
 * silently assuming INR's two decimals.
 */

/** The one and only API origin the OpenAPI document declares. */
export const API_BASE = "https://api.razorpay.com/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Extra headers beyond `accept`/`content-type` — e.g. `X-Refund-Idempotency`. */
  headers?: Record<string, string>;
}

/** Razorpay's list envelope, returned by every collection endpoint. */
export interface RazorpayCollection<T> {
  entity?: "collection";
  count?: number;
  items: T[];
}

interface RazorpayErrorBody {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    field?: string;
    metadata?: unknown;
  };
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can carry a long `description`. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Razorpay's error body into one actionable line.
 *
 * `code` is kept even though it is nearly always `BAD_REQUEST_ERROR` — the
 * `reason` (e.g. `insufficient_funds`, `invalid_expiry_date`) and `field` are
 * the parts a caller actually acts on, and both are optional, so a flattened
 * "HTTP 400" would hide whichever of them Razorpay did send.
 */
export function formatRazorpayError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: RazorpayErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as RazorpayErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Razorpay ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Razorpay ${status} ${err.code ?? "error"} for ${method} ${path}`,
    err.description,
    err.reason ? `reason: ${err.reason}` : undefined,
    err.field ? `field: ${err.field}` : undefined,
    status === 429 ? "rate limit exceeded; retry with exponential backoff and jitter" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(" — "), 1000);
}

export class RazorpayClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(path, { method: "POST", body, headers });
  }

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Razorpay documents `expand[]` etc. as `style: form, explode: true` —
      // one parameter name repeated per value — which `.set` cannot express.
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(`${k}[]`, item);
        continue;
      }
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatRazorpayError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
