/**
 * Grain's **Public API v2** — the AI meeting-recording/notes assistant at
 * grain.com. Verified against the vendor's own reference at
 * `https://developers.grain.com/` (`<title>Grain API</title>`, single-page
 * HTML doc, fetched 2026-08-24) — there is no OpenAPI document, so every
 * path, param and response shape below is transcribed from that page's prose
 * and example `curl`/JSON blocks, not inferred.
 *
 * ## Base URL
 *
 * One host, no regions, no per-tenant subdomain: `https://api.grain.com`
 * ("API Domain is: https://api.grain.com", verbatim). Every documented
 * endpoint lives under the `/_/public-api/...` prefix.
 *
 * ## Two headers, every request
 *
 *   - `Authorization: Bearer TOKEN` — a Personal Access Token, a Workspace
 *     Access Token, or an OAuth2 access token (see `../auth/api-key.ts` for
 *     why only the first two are implemented here).
 *   - `Public-Api-Version: 2025-10-31` — REQUIRED on every call. The docs
 *     list exactly one supported version (2025-10-31, marked "*current
 *     version") and give no fallback behavior for an omitted header, so this
 *     client always sends it rather than relying on an implicit default.
 *
 * ## The verb is POST for almost everything, including reads
 *
 * List Recordings, Get Recording, List Users, List Teams, List Meeting Types
 * and List Hooks are all documented as `POST`, because the "GET with a JSON
 * body" alternative Grain would otherwise need doesn't fit filter/include
 * objects into query strings. Only the transcript, download and (both)
 * webhook-delivery-adjacent GETs, plus the two DELETEs and one PATCH, use a
 * different verb. Do not assume "read" implies GET here.
 *
 * ## No uniform pagination envelope
 *
 * Only `List Recordings` paginates — `{ cursor, recordings: [...] }`, where
 * `cursor` (from the previous response) is echoed back as a top-level
 * request field, not a query param, and is `null` on the last page.
 * `List Users` / `List Teams` / `List Meeting Types` / `List Hooks` return
 * their full array in one call with no cursor at all — Grain publishes no
 * paging for them, and this client does not invent one.
 *
 * ## Errors
 *
 * The docs enumerate accepted params and success shapes exhaustively but
 * publish no general error-body schema (only "300 requests per minute...
 * returns a 429" for rate limiting). This client therefore reports the
 * status plus a truncated body on failure rather than pretending to know a
 * field name.
 *
 * ## Rate limits
 *
 * Documented plainly: 300 requests/minute account-wide, with
 * `x-ratelimit-limit` / `x-ratelimit-remaining` on every response and
 * `Retry-After` added only once the limit is exceeded (429).
 */
import type { HookContext } from "@w6w/types";

/** The API's only host. Mirrored in `w6w.network.allow`. */
export const API_HOST = "api.grain.com";

/** Every documented endpoint lives under this prefix. */
export const API_BASE = "https://api.grain.com/_/public-api";

/** The one currently-supported `Public-Api-Version` value. */
export const API_VERSION = "2025-10-31";

export interface RequestOptions {
  method?: string;
  /** JSON request body — every write and every "read via POST" endpoint takes one. */
  body?: Record<string, unknown>;
  /** Extra headers to merge in (e.g. `accept` overrides for a text/binary response). */
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset so an optional field isn't sent as null/empty. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** A rate-limit reading lifted off a response's headers. */
export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  /** Only sent once the 300/min limit is exceeded (on the 429 itself). */
  retryAfterSeconds?: number;
}

const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Read Grain's documented rate-limit headers (case-insensitive via `Headers.get`). */
export function readRateLimit(headers: Headers): RateLimitReading {
  return {
    limit: num(headers.get("x-ratelimit-limit")),
    remaining: num(headers.get("x-ratelimit-remaining")),
    retryAfterSeconds: num(headers.get("Retry-After")),
  };
}

/** Base64-encode a byte array (no url-safe transformation). */
export function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Authorization: Bearer <token>`. It DOES always set `Public-Api-Version`,
 * because that header carries no credential and is required on every call.
 */
export class GrainClient {
  constructor(private ctx: HookContext) {}

  static url(path: string): string {
    return `${API_BASE}${path}`;
  }

  /** Issue a request and hand back the raw `Response` (used for binary/text bodies and quota). */
  send(path: string, options: RequestOptions = {}): Promise<Response> {
    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {
      accept: "application/json",
      "public-api-version": API_VERSION,
      ...(options.headers ?? {}),
    };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    return this.ctx.fetch(GrainClient.url(path), init);
  }

  /**
   * Issue a request and parse the JSON body. Returns `undefined` for an
   * empty body (no Grain endpoint documents a 204, but this stays defensive).
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const method = (options.method ?? "GET").toUpperCase();
    const res = await this.send(path, options);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(
        `Grain ${res.status} for ${method} ${path}: ${text ? text.slice(0, 200) : res.statusText}`,
      );
    }
    if (!text) return undefined;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Grain returned a non-JSON body for ${method} ${path}`);
    }
  }
}
