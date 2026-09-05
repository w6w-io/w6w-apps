import type { HookContext } from "@w6w/types";

/**
 * Canva Connect API base. Every action path below is relative to this.
 * Verified 2026-09-05 against https://www.canva.dev/docs/connect/ — every
 * endpoint's HTTP method, path, scope and request/response shape came from
 * the live reference pages, not a third-party integration directory.
 */
export const API_URL = "https://api.canva.com";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Extra headers beyond `accept`/`content-type` (e.g. `Asset-Upload-Metadata`). */
  headers?: Record<string, string>;
  /** Raw request body (already-encoded bytes) instead of a JSON-encoded `body`. */
  rawBody?: Uint8Array;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which injects the
 * OAuth `Bearer` token.
 */
export class CanvaClient {
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
    if (options.rawBody !== undefined) {
      headers["content-type"] ??= "application/octet-stream";
      init.body = options.rawBody as BodyInit;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        // ignore
      }
      throw new Error(
        `Canva ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}

/**
 * Decode a `file`-type param into raw bytes. Accepts either a `data:` URL
 * (`data:image/png;base64,...`) or a bare base64 string.
 */
export function base64ToBytes(input: string): Uint8Array {
  const match = input.match(/^data:([^;]+);base64,(.*)$/s);
  const clean = match ? match[2] : input;
  return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
}

/**
 * Encode a string (a Canva asset name, which may contain emoji or other
 * non-ASCII characters) into the base64 form the `Asset-Upload-Metadata` /
 * `Url-Asset-Upload-Metadata` headers require.
 */
export function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
