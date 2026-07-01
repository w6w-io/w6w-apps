import type { HookContext } from "@w6w/types";

export const API_URL = "https://www.googleapis.com/drive/v3";
export const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const FOLDER_MIME = "application/vnd.google-apps.folder";
export const DOCUMENT_MIME = "application/vnd.google-apps.document";

/**
 * Query params common to Google Drive requests that need to see items across
 * user My Drive + shared drives. We always tack these on unless the caller
 * overrides — v2 of the n8n node did the same.
 */
export const ALL_DRIVES_QS = {
  includeItemsFromAllDrives: true,
  supportsAllDrives: true,
} as const;

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON object → JSON-encoded body. Explicit `null`/`undefined` → no body. */
  body?: unknown;
  /** Override the default `application/json` content-type (e.g. for uploads). */
  contentType?: string;
  /** Raw body override; when set, `body` is ignored and `rawBody` is sent as-is. */
  rawBody?: BodyInit | Uint8Array;
  /** Additional request headers. */
  headers?: Record<string, string>;
  /** Full URL override — used for the upload endpoint. */
  baseUrl?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is applied by the runtime through the
 * auth `sign` hook, so we never touch Authorization here.
 */
export class GoogleDriveClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const base = options.baseUrl ?? API_URL;
    const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.rawBody !== undefined) {
      // Widen Uint8Array<ArrayBufferLike> to a plain BodyInit-compatible view.
      body = options.rawBody as BodyInit;
      if (options.contentType) headers["content-type"] = options.contentType;
    } else if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = options.contentType ?? "application/json";
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
        `Google Drive ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return res.json() as Promise<T>;
    // Binary payload (download): return the raw ArrayBuffer.
    return (await res.arrayBuffer()) as unknown as T;
  }

  /**
   * Multipart upload for the two-part "metadata + content" case Google Drive
   * supports via `?uploadType=multipart`. Returns the created file resource.
   */
  async multipartUpload<T = unknown>(
    metadata: Record<string, unknown>,
    content: string | ArrayBuffer | Uint8Array,
    contentMimeType: string,
    query: Record<string, string | number | boolean | undefined | null> = {},
  ): Promise<T> {
    const boundary = `w6w-boundary-${crypto.randomUUID()}`;
    const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${
      JSON.stringify(metadata)
    }\r\n`;
    const contentHeader = `--${boundary}\r\nContent-Type: ${contentMimeType}\r\n\r\n`;
    const trailer = `\r\n--${boundary}--`;
    const contentBytes = typeof content === "string"
      ? new TextEncoder().encode(content)
      : content instanceof Uint8Array
      ? content
      : new Uint8Array(content);
    const head = new TextEncoder().encode(metaPart + contentHeader);
    const tail = new TextEncoder().encode(trailer);
    const body = new Uint8Array(head.byteLength + contentBytes.byteLength + tail.byteLength);
    body.set(head, 0);
    body.set(contentBytes, head.byteLength);
    body.set(tail, head.byteLength + contentBytes.byteLength);

    return this.request<T>("/files", {
      method: "POST",
      baseUrl: UPLOAD_URL,
      query: { uploadType: "multipart", ...query },
      rawBody: body,
      contentType: `multipart/related; boundary=${boundary}`,
    });
  }

  /**
   * Simple content-only upload via `?uploadType=media`. Returns the created
   * file resource (metadata may then be PATCHed onto it).
   */
  async simpleUpload<T = unknown>(
    content: string | ArrayBuffer | Uint8Array,
    contentMimeType: string,
    query: Record<string, string | number | boolean | undefined | null> = {},
  ): Promise<T> {
    const bytes = typeof content === "string"
      ? new TextEncoder().encode(content)
      : content instanceof Uint8Array
      ? content
      : new Uint8Array(content);
    return this.request<T>("/files", {
      method: "POST",
      baseUrl: UPLOAD_URL,
      query: { uploadType: "media", ...query },
      rawBody: bytes,
      contentType: contentMimeType,
    });
  }
}

/**
 * Set the `parents` entry for a create/copy request. `folderId` wins if set;
 * otherwise we fall back to the drive root (Google's default when `parents`
 * is omitted uses `root`).
 */
export function resolveParent(folderId?: string, driveId?: string): string {
  if (folderId) return folderId;
  if (driveId) return driveId;
  return "root";
}
