import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.brevo.com/v3";

/**
 * Brevo uses offset/limit pagination on list endpoints. Envelopes vary by
 * resource (`contacts`, `attributes`, `senders`, `templates`, `lists`, …) — the
 * generic list response type parameterizes the wrapping property name.
 */
export type BrevoList<K extends string, T = unknown> =
  & { count?: number }
  & { [P in K]: T[] };

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set the `api-key` header here —
 * the runtime routes the request through the auth `sign` hook, which injects
 * it.
 */
export class BrevoClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
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
        `Brevo ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
