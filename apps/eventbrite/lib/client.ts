import type { HookContext } from "@w6w/types";

export const API_URL = "https://www.eventbriteapi.com/v3";

/**
 * Eventbrite uses two pagination styles: page-number (legacy, default) and
 * continuation-token (used by /events/ and /attendees/ endpoints). Both return
 * the same envelope shape — we keep the response loose since callers usually
 * only care about the wrapped list and `pagination.continuation`/`has_more_items`.
 */
export interface EventbritePagination {
  object_count?: number;
  page_number?: number;
  page_size?: number;
  page_count?: number;
  has_more_items?: boolean;
  continuation?: string;
}

export type EventbriteListResponse<K extends string, T = unknown> = {
  pagination: EventbritePagination;
} & { [P in K]: T[] };

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set Authorization here — the
 * runtime routes the request through the auth `sign` hook, which injects it.
 */
export class EventbriteClient {
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
      throw new Error(`Eventbrite ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${url.pathname}: ${detail}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
