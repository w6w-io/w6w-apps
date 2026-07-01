import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.anthropic.com";

/**
 * All Anthropic requests carry this pinned version header. It selects the wire
 * shape and behaviour of the API — 2023-06-01 is the current stable version.
 * See: https://docs.anthropic.com/en/api/versioning
 */
export const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Beta flags — pass as a comma-separated list in `anthropic-beta`. Verified
 * against the docs on 2026-07-01; if Anthropic promotes a feature to GA these
 * flags become no-ops (harmless) but may eventually be rejected.
 *
 * - `files-api-2025-04-14` — required for every `/v1/files` endpoint.
 *
 * Message Batches (`/v1/messages/batches`) is now GA and requires NO beta
 * flag; the historical flag `message-batches-2024-09-24` is still accepted for
 * back-compat but no longer needed.
 */
export const BETA_FILES_API = "files-api-2025-04-14";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body — stringified with content-type application/json. */
  body?: unknown;
  /** Multipart body — passed straight through; fetch sets the boundary. */
  form?: FormData;
  /** Extra headers merged over defaults (e.g. `anthropic-beta`). */
  headers?: Record<string, string>;
  /**
   * If set, the response is read as text (not parsed as JSON). Used by
   * `batch-results`, which returns JSONL rather than JSON.
   */
  asText?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch` for the Anthropic REST API.
 *
 * We always inject `anthropic-version`. We never set `x-api-key` here — the
 * runtime routes the request through the auth `sign` hook, which injects it.
 * Endpoints that need a beta feature merge `anthropic-beta` via `options.headers`.
 */
export class AnthropicClient {
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
      "anthropic-version": ANTHROPIC_VERSION,
      ...(options.headers ?? {}),
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.form !== undefined) {
      // Multipart — do NOT set content-type, fetch adds it with the boundary.
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
        `Anthropic ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    if (options.asText) return (await res.text()) as unknown as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Parse an Anthropic JSONL stream (used by `/v1/messages/batches/{id}/results`)
 * into an array of decoded objects. Empty lines are skipped. Malformed lines
 * throw, so the caller sees the wire body rather than silently losing data.
 */
export function parseJsonl<T = unknown>(text: string): T[] {
  const out: T[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    out.push(JSON.parse(line) as T);
  }
  return out;
}

/**
 * Decode a base64 string (with or without a `data:` prefix) into an ArrayBuffer
 * suitable for wrapping in a `Blob` / `File` for multipart upload. Callers
 * typically pass a base64 payload as a plain string in action params.
 */
export function base64ToBytes(input: string): ArrayBuffer {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned);
  const buffer = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buffer;
}
