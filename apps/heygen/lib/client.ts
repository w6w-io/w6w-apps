import type { HookContext } from "@w6w/types";

/**
 * HeyGen External API client.
 *
 * Everything in this module was verified on 2026-08-24 against HeyGen's own
 * machine-readable OpenAPI 3.1 document (`developers.heygen.com/openapi/external-api.json`,
 * 1,159,990 bytes, `info.title` "HeyGen External API", 98 documented paths) plus live probes
 * against `api.heygen.com`. Nothing came from a third-party integration directory.
 *
 * The Mintlify docs shell also serves a plausible-looking
 * `developers.heygen.com/api-reference/openapi.json` — that one is Mintlify's own bundled
 * "OpenAPI Plant Store" sample (5,173 bytes, `info.title` "OpenAPI Plant Store"), not HeyGen's
 * API. `openapi/external-api.json` (linked from the docs' own `llms.txt` under "OpenAPI Specs")
 * is the real one.
 *
 * ## One host, mixed versions
 *
 * The document declares exactly one server, `https://api.heygen.com`. HeyGen is mid-migration
 * from v1/v2 to v3 (v1/v2 "supported until October 31, 2026" per the Quick Start doc) — this app
 * only builds `/v3/...` paths, the generation the vendor is steering integrators toward.
 *
 * ## Two envelope shapes, not one
 *
 * Every single-resource response wraps its payload as `{"data": {...}}}` — see
 * {@link HeyGenClient.data}. Every list endpoint answers a *different* envelope:
 * `{"data": [...], "has_more": bool, "next_token": string|null}` — the pagination fields sit
 * beside `data`, not inside it. Treating a list response as a bare `data` unwrap silently drops
 * `has_more`/`next_token` and breaks pagination; {@link HeyGenClient.list} keeps the two shapes
 * apart on purpose.
 *
 * ## Errors
 *
 * Every failure is `{"error": {"code", "message", "param"?, "doc_url"?}}` with a 4xx/5xx status.
 * `code` is a stable machine string (`unauthorized`, `insufficient_credit`, `video_not_found`,
 * `rate_limit_exceeded`, …) documented at https://developers.heygen.com/docs/error-codes, and is
 * surfaced verbatim by {@link formatHeyGenError} because the fix differs per code — `402
 * insufficient_credit` needs a top-up, `404 video_not_found` needs a different ID, and a flattened
 * "HTTP 4xx" hides which one happened.
 *
 * ## A missing key and an invalid key are byte-identical
 *
 * Measured live 2026-08-24: `GET /v3/users/me` with NO `X-Api-Key` header and the same request
 * with a syntactically-plausible-but-fake key both answer `401
 * {"error":{"code":"unauthorized","message":"Unauthorized",...}}` — nothing distinguishes "the
 * credential never arrived" from "the credential is wrong". `auth/api-key.ts`'s `test` hook cannot
 * tell those apart and does not pretend to.
 *
 * ## Rate limits
 *
 * A 429 carries `Retry-After` (seconds to wait) and nothing else — no `X-RateLimit-Limit`, no
 * remaining count, no window size, on a successful OR a rate-limited response (measured live
 * 2026-08-24: the only headers HeyGen sends back are `date`, `content-type`, `content-length` and
 * `server`). See `health/request-rate.ts` for why that half of quota is a declared absence.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.heygen.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Multipart body — passed straight through; `ctx.fetch` sets the boundary. */
  form?: FormData;
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
}

/** The envelope every list endpoint answers: `data` alongside cursor fields, not inside them. */
export interface HeyGenPage<T> {
  items: T[];
  hasMore: boolean;
  nextToken: string | null;
}

interface HeyGenErrorBody {
  error?: { code?: string; message?: string; param?: string | null; doc_url?: string | null };
}

/** Drop keys the caller left unset. `false` and `0` survive: both can be meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json`-typed param through in whichever shape it arrived, so both are handled
 * here rather than at each call site. Used by `template-video-generate`'s `variables` param, which
 * is a discriminated union keyed by the template's own variable names.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Split a comma-separated list param (or an already-parsed array) into trimmed entries. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn HeyGen's `{"error": {...}}` body into one actionable line.
 *
 * `code` is kept because the vendor's own troubleshooting docs are written against it —
 * `insufficient_credit`, `video_not_found`, `phone_verification_required` and
 * `rate_limit_exceeded` are four different problems with four different fixes, and all of them
 * arrive as a bare 4xx without it.
 */
export function formatHeyGenError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  let parsed: HeyGenErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HeyGenErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `HeyGen ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `HeyGen ${status} ${err.code ?? "error"} for ${method} ${path}`,
    err.message,
    err.param ? `param: ${err.param}` : undefined,
    status === 429 && retryAfter ? `retry after ${retryAfter}s` : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class HeyGenClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": {...}}` in, the inner object out. The shape of every single-resource endpoint. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return body?.data as T;
  }

  /**
   * `{"data": [...], "has_more", "next_token"}` in, a normalised page out.
   *
   * Deliberately distinct from {@link HeyGenClient.data}: a list response carries its pagination
   * fields BESIDE `data`, not inside it, so unwrapping the same way would silently drop them.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<HeyGenPage<T>> {
    const body = await this.json<{ data?: T[]; has_more?: boolean; next_token?: string | null }>(
      path,
      options,
    );
    return {
      items: body?.data ?? [],
      hasMore: body?.has_more ?? false,
      nextToken: body?.next_token ?? null,
    };
  }

  /** Parse the body without unwrapping any envelope. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints where the caller needs nothing from the body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.headers ?? {}),
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form !== undefined) {
      // Multipart — do NOT set content-type; ctx.fetch adds it with the boundary.
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatHeyGenError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("retry-after"),
        ),
      );
    }
    return res;
  }
}

/**
 * Decode a base64 string (with or without a `data:` prefix) into an `ArrayBuffer` suitable for
 * wrapping in a `Blob` for multipart upload. `actions/asset-upload.ts` is the only caller.
 */
export function base64ToBytes(input: string): ArrayBuffer {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned);
  const buffer = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buffer;
}
