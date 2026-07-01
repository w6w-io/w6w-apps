import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.notion.com/v1";

/**
 * The Notion-Version header every request must carry. Pinned to the version
 * declared here rather than derived from the caller so the app's semantics
 * don't silently drift when Notion ships a new schema.
 */
export const NOTION_VERSION = "2022-06-28";

/**
 * Notion paginates every list endpoint the same way: pass `start_cursor` +
 * `page_size` in the query (or body for POST endpoints), get back `results`,
 * `next_cursor` and `has_more`. We surface the raw envelope — action helpers
 * decide whether to auto-walk or just return one page.
 */
export interface NotionListResponse<T = unknown> {
  object: "list";
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
  type?: string;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` that pins `Notion-Version` on every request.
 * As with the other apps we never set Authorization here — the runtime routes
 * the request through the auth `sign` hook, which injects it.
 */
export class NotionClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      "Notion-Version": NOTION_VERSION,
      accept: "application/json",
    };
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
        `Notion ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
