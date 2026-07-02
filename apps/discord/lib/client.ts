import type { HookContext } from "@w6w/types";

export const API_URL = "https://discord.com/api/v10";

/**
 * Options accepted by DiscordClient.request. The Authorization header is never
 * set here — the runtime routes the request through the auth `sign` hook, which
 * injects it (see auth/bot-token.ts and auth/oauth2.ts).
 */
export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` targeting the Discord REST API.
 *
 * Discord returns non-2xx responses with a JSON error body. We surface the
 * response text verbatim so upstream error codes (10008 unknown message,
 * 50001 missing access, …) are visible in workflow logs.
 *
 * Rate limiting: Discord returns 429 with a `retry_after` field. We do not
 * transparently retry — a `429` bubbles up like any other non-2xx so the
 * host's retry policy can decide.
 */
export class DiscordClient {
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
        `Discord ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    // Discord PUT/DELETE endpoints (reactions, role changes, message delete)
    // return 204; a POST like message send returns a body. Some endpoints
    // occasionally return an empty body with a 2xx — treat that as undefined.
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
