import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.omnisend.com/api";

/**
 * Every 2026-03-15 request is pinned to this API version via the
 * `Omnisend-Version` header (required on every request, per
 * https://api-docs.omnisend.com/reference/authentication). We bake the value
 * in here so an Omnisend release never silently breaks a running workflow —
 * bump this string deliberately.
 */
export const API_VERSION = "2026-03-15";

/**
 * Omnisend's 2026-03-15 error responses are RFC 9457 Problem Details:
 * `{ type, title, status, detail, instance, errors? }`. `errors` is present
 * on 400 field-validation failures; `retryAfter` (seconds) is present on 429.
 */
export interface OmnisendProblem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  retryAfter?: number;
  errors?: Array<{ field?: string; code?: string; message?: string }>;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Every call carries `Omnisend-Version` and
 * `accept`; writes also carry `content-type: application/json`. Authorization
 * is never set here — the runtime routes the request through the auth `sign`
 * hook, which injects the `Authorization: Omnisend-API-Key <key>` header.
 */
export class OmnisendClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`,
    );
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      "omnisend-version": API_VERSION,
      accept: "application/json",
    };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Read the body once, as text: a `Response`'s body can only be
      // consumed once, so parsing it as JSON first and falling back to
      // `res.text()` on failure would read an already-drained stream and
      // silently lose the raw error text for a non-JSON failure body.
      const raw = await res.text().catch(() => "");
      let problem: OmnisendProblem | null = null;
      try {
        problem = raw ? JSON.parse(raw) as OmnisendProblem : null;
      } catch { /* not JSON — fall through to the raw text */ }
      const detail = problem?.detail ?? problem?.title ?? raw;
      throw new Error(`Omnisend ${res.status} for ${method} ${url.pathname}: ${detail}`);
    }
    // 202 Accepted (async batch/tag jobs) and 204 No Content carry no body.
    if (res.status === 202 || res.status === 204) return undefined as T;
    const text = await res.text();
    if (text.length === 0) return undefined as T;
    return JSON.parse(text) as T;
  }
}
