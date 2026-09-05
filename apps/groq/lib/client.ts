import type { HookContext } from "@w6w/types";

/**
 * Groq's OpenAI-compatible surface lives under `/openai/v1` on `api.groq.com`
 * — NOT `/v1` the way OpenAI itself serves it. Every action in this app calls
 * through here, so the prefix only needs to be right in one place.
 */
export const API_URL = "https://api.groq.com/openai/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body — will be stringified and content-type set to application/json. */
  body?: unknown;
  /**
   * Multipart body — passed straight to `fetch` as `FormData`. Do not set
   * content-type manually; the runtime infers it (with the boundary).
   */
  form?: FormData;
  /** Extra headers merged over defaults. */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch` for the Groq API. Note we never set
 * Authorization here — the runtime routes this request through the auth
 * `sign` hook, which injects `Bearer <apiKey>`.
 */
export class GroqClient {
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
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.form !== undefined) {
      // Multipart — let fetch set the content-type (with the boundary).
      init.body = options.form;
    } else if (options.body !== undefined) {
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
        `Groq ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /**
   * For endpoints that answer with a raw binary body (audio/speech returns
   * `audio/wav`, not JSON) rather than a JSON envelope. Returns the payload
   * base64-encoded, since a hook's return value crosses the sandbox boundary
   * and must be JSON-safe.
   */
  async requestBinary(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ base64: string; contentType: string }> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
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
        `Groq ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    const buffer = await res.arrayBuffer();
    return {
      base64: bytesToBase64(buffer),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }
}

/**
 * Decode a base64 string (with or without a `data:` prefix) into an
 * ArrayBuffer suitable for wrapping in a `Blob` / `File` for multipart
 * upload. Users typically pass a base64 payload as a plain string in the
 * action params.
 *
 * Returns `ArrayBuffer` (not `Uint8Array`) so it's assignable to `BlobPart`
 * without the SharedArrayBuffer union mismatch under strict TS lib configs.
 */
export function base64ToBytes(input: string): ArrayBuffer {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned);
  const buffer = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buffer;
}

/** Encode raw bytes as base64 — the inverse of {@link base64ToBytes}. */
export function bytesToBase64(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = "";
  // Chunked to avoid blowing the call stack on `String.fromCharCode(...bytes)`
  // for a large file.
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
