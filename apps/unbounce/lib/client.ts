import type { HookContext } from "@w6w/types";

/**
 * Unbounce API v0.4 REST client (`api.unbounce.com`).
 *
 * Every path, verb, query parameter and response field in this app was verified
 * on 2026-08-30 by fetching Unbounce's own developer portal
 * (`developer.unbounce.com/api_reference/`, 171,413 bytes — a server-rendered
 * reference with an inline JSON Schema per endpoint, not a SPA) and by live
 * probes against `api.unbounce.com`. Nothing here came from a third-party
 * integration directory.
 *
 * ## Versioned Accept header
 *
 * The vendor's own getting-started guide sends every request with
 * `Accept: application/vnd.unbounce.api.v0.4+json` — the "0.3 → 0.4" migration
 * notes in the reference (snake_case fields, string ids, no null placeholders)
 * only make sense once a specific version is pinned, so this client sends it on
 * every request rather than relying on whatever the vendor's undocumented
 * default resolves to.
 *
 * ## Two auth schemes, and neither works everywhere
 *
 * Unbounce accepts HTTP Basic (the API key as the username, an empty password)
 * or an OAuth 2.0 bearer token — see `auth/api-key.ts` and `auth/oauth2.ts`. An
 * API key authenticates as an **account administrator**: it can read everything
 * an admin can see, but two endpoints are documented as **OAuth-only**
 * (`page-lead-delete`, `page-lead-deletion-request-create`) and refuse an API
 * key outright. That is a vendor restriction this app cannot route around, so
 * both actions carry it in their `description` rather than silently working for
 * some connections and not others.
 *
 * ## Errors are NOT one shape
 *
 * The reference's own "Errors" section documents HTTP status codes only, and
 * reading it suggests a uniform JSON error body. The wire disagrees, measured
 * live against `api.unbounce.com` on 2026-08-30:
 *
 *  - An **unmatched route** (`GET /` with no trailing path) answers JSON:
 *    `{"message": "Not Found", "documentation": "https://api.unbounce.com/doc"}`.
 *  - A **missing or rejected credential** (`GET /accounts` with no Basic header,
 *    or a syntactically-plausible but wrong one) answers `401` as **plain
 *    text**: `"Unauthorized\nRequested URL: https://api.unbounce.com/accounts"`
 *    — no JSON, and no field distinguishing "no credential" from "bad
 *    credential" the way Apify's `token-not-provided` /
 *    `user-or-token-not-found` codes do.
 *
 * So {@link formatUnbounceError} tries JSON first and falls back to the raw
 * text — treating the documented shape as the exception, not the rule.
 *
 * ## Rate limits
 *
 * 500 requests/minute per user account *and* IP address; a `429` means it was
 * exceeded. No `X-RateLimit-*` (or equivalent) response header is documented,
 * and none was observed on a live unauthenticated probe — so this app declares
 * no `quota` health check rather than inventing a headroom figure Unbounce
 * never publishes.
 */

/** The one and only API origin. */
export const API_BASE = "https://api.unbounce.com";

/** Pinned so a future vendor default change can't silently alter field casing. */
export const ACCEPT_HEADER = "application/vnd.unbounce.api.v0.4+json";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Render a boolean query flag the way the reference documents it: `"true"` / `"false"`, not `1`/`0`. */
export function flag(v: boolean | undefined): string | undefined {
  return v === undefined ? undefined : String(v);
}

/** Path-escape a caller-supplied resource id (account, sub-account, domain, page, lead, user). */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Unbounce's response body into one actionable line, whichever of the two
 * observed shapes it arrives in. See the module doc for why there are two.
 */
export function formatUnbounceError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: { message?: string; documentation?: string } | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — the plain-text auth-failure shape */ }

  const message = parsed && typeof parsed === "object" && typeof parsed.message === "string"
    ? parsed.message
    : truncate(raw.replace(/\s+/g, " ").trim());

  const parts = [
    `Unbounce ${status} for ${method} ${path}: ${message}`,
    status === 429
      ? "Unbounce rate-limits at 500 requests/minute per account and IP; retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(" — "), 1000);
}

export class UnbounceClient {
  constructor(private ctx: HookContext) {}

  async get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return await this.send<T>(path, { method: "GET", query });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.send<T>(path, { method: "POST", body });
  }

  /** Status only — `DELETE /pages/{page_id}/leads/{lead_id}` answers with no body. */
  async delete(path: string): Promise<number> {
    const res = await this.raw(path, { method: "DELETE" });
    return res.status;
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const res = await this.raw(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async raw(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: ACCEPT_HEADER };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatUnbounceError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
