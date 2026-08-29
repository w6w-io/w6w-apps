import type { HookContext } from "@w6w/types";

/**
 * Pinterest REST API v5 client.
 *
 * Verified 2026-08-29 against Pinterest's own OpenAPI 3.0 description —
 * `github.com/pinterest/api-description`, `v5/openapi.json` (2.6 MB,
 * `info.version` `5.28.0`) — plus live probes against `api.pinterest.com`.
 * Nothing here came from a third-party integration directory.
 *
 * ## One host, one server entry
 *
 * The OpenAPI document declares exactly one server: `https://api.pinterest.com/v5`.
 * There is no regional host and no sandbox environment.
 *
 * ## One response shape
 *
 * Unlike Apify's three-shapes-in-one-API, every Pinterest v5 endpoint used here
 * answers a plain JSON object or array — no envelope to unwrap. List endpoints
 * answer `{ items: [...], bookmark: string | null }` (cursor pagination, not
 * offset/limit); a single-resource read/write answers that resource directly.
 * Delete answers `204` with no body.
 *
 * ## Errors
 *
 * Confirmed live (`GET /v5/user_account` with no and with a bogus token, both
 * `401`): `{"code": 2, "message": "Authentication failed.", "status": "failure"}`.
 * The documented generic error schema (`Pinterest.Lib.Error`) only states
 * `code` and `message`; `status` was observed on the wire in addition. `code`
 * is a small integer, not a stable per-problem string like Apify's `type` —
 * Pinterest does not document a code table, so {@link formatPinterestError}
 * surfaces the HTTP status and `message` rather than pretending `code` means
 * something specific.
 *
 * ## Rate limits
 *
 * Pinterest documents per-endpoint call-volume tiers but exposes **no**
 * `X-RateLimit-*` (or any other) response header on success or on a `401` —
 * confirmed live. See `health/quota.ts` for what that means for headroom
 * reporting.
 */

/** The one and only API origin + version prefix. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.pinterest.com/v5";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Pinterest's cursor-paginated list envelope — every list endpoint used here. */
export interface PinterestListPage<T> {
  items: T[];
  bookmark?: string | null;
}

interface PinterestErrorBody {
  code?: number;
  message?: string;
  status?: string;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — both are
 * meaningful values, not "unset".
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Join a multiselect param's values the way `domains` and `creative_types` expect: comma-separated. */
export function toCommaList(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/**
 * Turn Pinterest's error body into one actionable line.
 *
 * Pinterest's generic error carries only a small integer `code` (undocumented
 * table) and a human `message`, so the HTTP status is what actually
 * disambiguates "bad request" from "not found" from "rate limited" — the
 * message is included verbatim because it is usually the more specific of the
 * two (e.g. "Board not found." vs. a bare 404).
 */
export function formatPinterestError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: PinterestErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PinterestErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const body = raw.length > 600 ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)` : raw;
    return `Pinterest ${status} for ${method} ${path}: ${body || "(empty body)"}`;
  }

  const parts = [
    `Pinterest ${status}${
      parsed.code !== undefined ? ` (code ${parsed.code})` : ""
    } for ${method} ${path}`,
    parsed.message,
    status === 429
      ? "Pinterest rate-limits per endpoint tier and publishes no remaining-quota header; " +
        "retry with backoff"
      : undefined,
  ].filter(Boolean);
  return parts.join(": ");
}

export class PinterestClient {
  constructor(private ctx: HookContext) {}

  /** Parsed JSON body. Used for every read/write in this app — nothing here answers non-JSON. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the delete endpoints (`204` with no body). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
      throw new Error(formatPinterestError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
