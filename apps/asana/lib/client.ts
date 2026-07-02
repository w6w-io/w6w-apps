import type { HookContext } from "@w6w/types";

export const API_URL = "https://app.asana.com/api/1.0";

/**
 * Asana wraps single-resource responses in `{ data: {...} }` and list
 * responses in `{ data: [...], next_page: {...} | null }`. `next_page.uri`
 * is an absolute URL to the next page (n8n's helper follows that
 * cursor-style pagination). We return the whole envelope from actions so
 * callers can page manually — no automatic walk here.
 */
export interface AsanaNextPage {
  offset?: string;
  path?: string;
  uri?: string;
}

export interface AsanaEnvelope<T> {
  data: T;
  next_page?: AsanaNextPage | null;
}

export interface RequestOptions {
  method?: string;
  /** Query string parameters. Falsy/undefined/empty are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Object body — sent verbatim under `{ "data": body }`, per Asana convention. */
  body?: Record<string, unknown>;
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set Authorization here — the
 * runtime routes the request through the auth `sign` hook, which injects it.
 *
 * Non-GET/HEAD/DELETE requests are wrapped in `{ data: body }` because that
 * is what Asana's REST API expects (mirrors n8n's `GenericFunctions.ts`).
 */
export class AsanaClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<AsanaEnvelope<T>> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const method = (options.method ?? "GET").toUpperCase();
    const init: RequestInit = { method, headers: {} };

    const bodyless = method === "GET" || method === "HEAD" || method === "DELETE";
    if (!bodyless && options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify({ data: options.body });
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Asana ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return { data: undefined as unknown as T };
    return res.json() as Promise<AsanaEnvelope<T>>;
  }
}
