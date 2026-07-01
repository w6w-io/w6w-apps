import type { HookContext } from "@w6w/types";

export const API_URL = "https://a.klaviyo.com/api";

/**
 * Every Klaviyo request is pinned to a specific API revision via the
 * `revision` header. We bake the value in here so a Klaviyo API change never
 * silently breaks a running workflow — bump this string deliberately.
 */
export const API_REVISION = "2024-10-15";

/**
 * Klaviyo responses are JSON:API-shaped: a top-level `data` (object or array),
 * plus `links` (pagination cursors) and `included` (side-loaded relationships).
 * We surface the whole envelope from actions so callers can drive their own
 * pagination and follow relationships without a second call.
 */
export interface KlaviyoEnvelope<T = unknown> {
  data?: T;
  links?: {
    self?: string;
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  included?: unknown[];
  meta?: Record<string, unknown>;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Every call carries the `revision` and
 * `accept` headers; writes also carry `content-type: application/json`.
 * Authorization is never set here — the runtime routes the request through
 * the auth `sign` hook, which injects the `Klaviyo-API-Key` header.
 */
export class KlaviyoClient {
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
      revision: API_REVISION,
      accept: "application/json",
    };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Klaviyo ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`,
      );
    }
    // 202 Accepted (async jobs) and 204 No Content commonly have an empty
    // body — don't try to parse. For other statuses, only parse if the
    // Content-Length or body actually carries something.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (text.length === 0) return undefined as T;
    return JSON.parse(text) as T;
  }
}
