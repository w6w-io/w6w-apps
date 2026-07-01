import type { HookContext } from "@w6w/types";

export const API_URL = "https://www.googleapis.com/calendar/v3";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON object → JSON-encoded body. `undefined`/`null` → no body. */
  body?: unknown;
  /** Additional request headers. */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is applied by the runtime through the
 * auth `sign` hook, so we never touch Authorization here.
 *
 * Note on encoding: Google Calendar IDs are frequently email-shaped
 * (`primary`, `foo@bar.com`, `abc123@group.calendar.google.com`) — callers
 * are expected to hand us the *raw* ID. `URL#pathname` doesn't percent-encode
 * `@`, so we build the URL by string concatenation and then let the `URL`
 * class normalize it; this preserves the shape Google's API expects.
 */
export class GoogleCalendarClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const init: RequestInit = { method: options.method ?? "GET", headers, body };
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Google Calendar ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Google Calendar accepts calendar IDs like `primary` or an email address in
 * the URL path. Encode once so `@` becomes `%40` (which Google requires) while
 * avoiding double-encoding of an already-encoded value that a caller might
 * pass in.
 */
export function encodeCalendarId(id: string): string {
  return encodeURIComponent(decodeURIComponent(id));
}
