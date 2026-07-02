import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.bitbucket.org/2.0";

/**
 * Bitbucket Cloud paginates with an opaque `next` URL: each list response
 * carries `values` plus a `next` field that is a fully-qualified URL to the
 * following page. Callers walk pages by re-issuing GET on `next` until it's
 * absent — no page numbers, no continuation tokens to reassemble.
 */
export interface BitbucketPagination {
  page?: number;
  pagelen?: number;
  size?: number;
  next?: string;
  previous?: string;
}

export type BitbucketListResponse<T = unknown> = BitbucketPagination & {
  values: T[];
};

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. We never set Authorization here — the runtime
 * routes the request through the auth `sign` hook, which injects it.
 */
export class BitbucketClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Bitbucket ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
