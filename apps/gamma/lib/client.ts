import type { HookContext } from "@w6w/types";

/**
 * Gamma Public API client (`public-api.gamma.app`, prefix `/v1.0`).
 *
 * Verified 2026-09-05 against the OpenAPI 3.0 fragments embedded in Gamma's own
 * Mintlify-hosted developer docs (`developers.gamma.app`), fetched via the
 * `.md`-suffix trick documented in `README.md`. Every path, verb, request field
 * and enum used by an action in this app was read off one of those fragments —
 * `servers: [{ url: "https://public-api.gamma.app" }]` and
 * `securitySchemes.api-key: { in: "header", name: "X-API-KEY" }` are identical
 * on every one of the 15 pages checked.
 *
 * ## One host, one auth header
 *
 * The vendor documents an OAuth 2.0 Bearer alternative for a handful of
 * management/analytics endpoints (`security: [{api-key: []}, {bearer: []}]`),
 * for apps acting on a user's behalf. This app declares only the `X-API-KEY`
 * method — `apiKey` auth has no connect flow beyond pasting a key, works for
 * every documented endpoint, and needs no redirect URI.
 *
 * ## Errors
 *
 * Every failure is `{"message": string, "statusCode": number}` — see
 * `reference/error-codes.md`. `statusCode` normally echoes the HTTP status but
 * is read from the body regardless, per the app-wide rule to classify from the
 * response body rather than the transport status alone.
 */

export const API_BASE = "https://public-api.gamma.app";
export const API_PREFIX = "/v1.0";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export interface GammaErrorBody {
  message?: string;
  statusCode?: number;
}

/** Drop keys the caller left unset — `false` and `0` survive. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Parse `{"message", "statusCode"}` if present; `null` when the body isn't that shape. */
export function parseGammaError(raw: string): GammaErrorBody | null {
  try {
    const body = JSON.parse(raw) as GammaErrorBody;
    return typeof body?.message === "string" ? body : null;
  } catch {
    return null;
  }
}

/**
 * Turn a Gamma error body into one actionable line.
 *
 * `402` and `429` get an extra sentence because the fix isn't "check your
 * input" — it's "buy credits" or "slow down" — and a flattened status code
 * hides which one applies.
 */
export function formatGammaError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const parsed = parseGammaError(raw);
  if (!parsed) return `Gamma ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Gamma ${status} for ${method} ${path}`,
    parsed.message,
    status === 402
      ? "the workspace is out of credits — see gamma.app/settings/billing or enable auto-recharge"
      : undefined,
    status === 429
      ? "rate-limited — check the x-ratelimit-remaining* headers and retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class GammaClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
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
      throw new Error(formatGammaError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
