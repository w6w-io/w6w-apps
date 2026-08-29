import type { HookContext } from "@w6w/types";

/**
 * AssemblyAI Speech-to-Text API v2 REST client.
 *
 * Verified on 2026-08-29 against AssemblyAI's own machine-readable OpenAPI document
 * (`www.assemblyai.com/docs/openapi.json`, Fern-generated, `info.version` 1.3.4) plus live
 * probes against `api.assemblyai.com`. Nothing here came from a third-party integration
 * directory.
 *
 * ## No envelope
 *
 * Unlike some REST APIs in this pack (CloudConvert's `{"data": …}`), every AssemblyAI
 * response body IS the resource — `POST /v2/transcript` returns the transcript object
 * directly, `GET /v2/transcript` returns `{page_details, transcripts}` directly. There is
 * nothing to unwrap.
 *
 * ## Two regions, not two contracts
 *
 * AssemblyAI documents a second host for EU data residency — `api.eu.assemblyai.com` —
 * serving the **identical** `/v2` paths with the identical contract (unlike CloudConvert's
 * sync/async host split, this is purely about where the data and processing live, not
 * blocking behaviour). Every action in this app takes an advanced `region` param
 * (`lib/params.ts`'s {@link regionParam}) so a workflow can address either.
 *
 * A transcript submitted on one region's host lives only on that host — using the wrong
 * region for a follow-up `Get`/`Delete`/etc. answers `404`, per AssemblyAI's own docs.
 *
 * ## Errors
 *
 * A failure is `{"error": "<message>"}` with a 4xx/5xx status, no machine-readable error
 * code (unlike CloudConvert's `code` field) — {@link formatAssemblyAiError} surfaces the
 * message verbatim. Measured live on 2026-08-29: an **unauthenticated** and an
 * **invalid-token** `GET /v2/transcript` both answer the identical
 * `401 {"error":"Authentication error, API token missing/invalid"}` — AssemblyAI does not
 * distinguish "no credential" from "wrong credential", so `auth/api-token.ts` does not try
 * to either.
 *
 * ## Rate limits
 *
 * AssemblyAI meters **parallel transcriptions in flight**, not requests-per-window in the
 * usual sense (a separate 20,000-requests-per-5-minutes HTTP ceiling also applies, across
 * submissions and polling combined) — see `health/quota.ts` for why neither is readable
 * without a side effect.
 */

/** Default region — the vendor's own default host. */
export const API_BASE = "https://api.assemblyai.com";
/** EU data-residency host — identical paths and contract. */
export const EU_API_BASE = "https://api.eu.assemblyai.com";
/** Every documented path carries this prefix, on both hosts. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  /** `"eu"` selects {@link EU_API_BASE}; anything else (including omitted) selects {@link API_BASE}. */
  region?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface AssemblyAiErrorBody {
  error?: string;
}

/** `"us"` (default, explicit or omitted) or `"eu"` -> the matching API host. */
export function baseForRegion(region?: string): string {
  return region === "eu" ? EU_API_BASE : API_BASE;
}

/** Comma-join a `multiselect`/`array` param the vendor's query grammar wants joined, not repeated. */
export function toArray(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  return (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
}

/** Keep an error message readable. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn AssemblyAI's `{"error": "..."}` body into one actionable line. There is no
 * machine-readable error code to preserve (unlike CloudConvert's `code`), so the vendor's
 * own message is surfaced verbatim.
 */
export function formatAssemblyAiError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: AssemblyAiErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as AssemblyAiErrorBody;
  } catch { /* not JSON (the /upload 422 case is plain text) — fall through to the raw body */ }

  const message = parsed?.error;
  const base = `AssemblyAI ${status} for ${method} ${path}`;
  const parts = [
    base,
    message ?? (raw ? truncate(raw) : undefined),
    status === 429
      ? "rate limit exceeded — see Retry-After, or health/quota.ts for why this app cannot " +
        "read headroom in advance"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class AssemblyAiClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. The body IS the resource — nothing to unwrap. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options, "application/json");
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Plain-text response — used only by `subtitles-get` (SRT/VTT is not JSON). */
  async text(path: string, options: RequestOptions = {}): Promise<string> {
    const res = await this.send(path, options, "text/plain");
    return await res.text();
  }

  private async send(
    path: string,
    options: RequestOptions,
    accept: string,
  ): Promise<Response> {
    const base = baseForRegion(options.region);
    const url = new URL(`${base}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatAssemblyAiError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
