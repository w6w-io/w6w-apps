import type { HookContext } from "@w6w/types";

export const SHEETS_API = "https://sheets.googleapis.com/v4";
export const DRIVE_API = "https://www.googleapis.com/drive/v3";

/**
 * Google Sheets REST responses vary widely (ValueRange, BatchUpdate replies,
 * Spreadsheet resource, etc.). We keep the response type loose here — each
 * action narrows what it consumes.
 */
export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is injected by the auth `sign` hook —
 * this client never touches Authorization directly.
 *
 * Google Sheets/Drive both live under separate origins but use the same OAuth
 * token; callers pass either an absolute URL or a `/v4/…` / `drive/v3/…`
 * relative path (resolved against `sheets.googleapis.com` by default).
 */
export class GoogleSheetsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http")
        ? path
        : path.startsWith("/drive/")
        ? `https://www.googleapis.com${path}`
        : `${SHEETS_API}${path.startsWith("/") ? path : `/${path}`}`,
    );
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
        `Google Sheets ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Convert a 1-based column letter (A, Z, AA, AZ) to a 0-based column index.
 * Used to translate A1 references into `deleteDimension` ranges.
 */
export function columnLetterToIndex(letter: string): number {
  const s = letter.trim().toUpperCase();
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 65 || c > 90) throw new Error(`Invalid column letter: ${letter}`);
    n = n * 26 + (c - 64);
  }
  return n - 1;
}
