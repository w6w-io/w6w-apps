import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.dropboxapi.com/2";
export const CONTENT_URL = "https://content.dropboxapi.com/2";

/**
 * Dropbox splits its API into two hosts: `api.dropboxapi.com` handles the
 * RPC-style JSON endpoints (create_folder, delete, move, copy, list_folder,
 * search) while `content.dropboxapi.com` handles binary upload/download. Both
 * accept the same Bearer token — the auth `sign` hook injects it, we never set
 * Authorization here.
 */

export interface RequestOptions {
  method?: string;
  /** JSON body — will be JSON.stringified and sent with content-type application/json. */
  body?: unknown;
  /** Raw body bytes (upload). Sent with content-type application/octet-stream. */
  rawBody?: Uint8Array;
  /**
   * Value for the `Dropbox-API-Arg` header used by content endpoints. The API
   * expects a JSON-encoded string in this header rather than the request body.
   */
  dropboxApiArg?: unknown;
  /** Extra headers to merge into the request. */
  headers?: Record<string, string>;
  /** When true, return the raw Response instead of a parsed body (used by download). */
  raw?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set Authorization here — the
 * runtime routes the request through the auth `sign` hook, which injects it.
 *
 * Most Dropbox endpoints are POST-only, even for reads, so we default to POST.
 * Endpoints that expect an empty body still want a JSON `null` per the docs;
 * callers that want a real payload pass it via `body`.
 */
export class DropboxClient {
  constructor(private ctx: HookContext) {}

  /**
   * Full URL builder. Callers pass either an absolute URL or a path (e.g.
   * `/files/create_folder_v2`) which is appended to `API_URL`.
   */
  private resolveUrl(path: string): string {
    if (path.startsWith("http")) return path;
    return `${API_URL}${path}`;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const method = options.method ?? "POST";
    const headers: Record<string, string> = { ...(options.headers ?? {}) };

    let body: BodyInit | undefined;

    if (options.rawBody !== undefined) {
      headers["content-type"] = "application/octet-stream";
      body = options.rawBody as unknown as BodyInit;
      if (options.dropboxApiArg !== undefined) {
        headers["Dropbox-API-Arg"] = JSON.stringify(options.dropboxApiArg);
      }
    } else if (options.dropboxApiArg !== undefined) {
      // Content endpoints that don't take a body (download) still require the
      // arg header.
      headers["Dropbox-API-Arg"] = JSON.stringify(options.dropboxApiArg);
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, { method, headers, body });
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Dropbox ${res.status} ${res.statusText} for ${method} ${url}: ${detail}`,
      );
    }
    if (options.raw) return res as unknown as T;
    if (res.status === 204) return undefined as T;

    // Content endpoints (download) return the file as the body and put the
    // metadata in the `Dropbox-API-Result` header; callers pass `raw: true` for
    // those. Everything else is JSON.
    return res.json() as Promise<T>;
  }
}
