import type { HookContext } from "@w6w/types";

export const DOCS_API = "https://docs.googleapis.com/v1";
export const DRIVE_API = "https://www.googleapis.com/drive/v3";

/**
 * Google Docs REST responses vary widely (Document resource, batchUpdate reply
 * with a `replies[]` array, Drive `File` resource for creation). We keep the
 * response type loose here — each action narrows what it consumes.
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
 * Google Docs lives under `docs.googleapis.com/v1`, but document *creation*
 * goes through Drive (`www.googleapis.com/drive/v3/files` with
 * `mimeType: application/vnd.google-apps.document`). Callers pass either an
 * absolute URL or a `/documents/…` (Docs) / `/drive/v3/…` (Drive) relative
 * path; the client routes to the correct origin.
 */
export class GoogleDocsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(
      path.startsWith("http")
        ? path
        : path.startsWith("/drive/")
        ? `https://www.googleapis.com${path}`
        : `${DOCS_API}${path.startsWith("/") ? path : `/${path}`}`,
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
        `Google Docs ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Extract a document ID from a Google Docs URL. Falls back to returning the
 * input unchanged when it doesn't look like a URL — mirrors n8n's
 * `extractID` helper, which lets users paste either raw IDs or full URLs.
 */
export function extractDocumentId(input: string): string {
  const match = /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/.exec(input);
  return match ? match[1] : input;
}

/**
 * Google's batchUpdate accepts an array of typed `Request` objects, each with
 * exactly one populated key (e.g. `insertText`, `replaceAllText`). We surface
 * that as a discriminated union so per-verb actions can build a single-entry
 * `requests[]` and the generic `document-batch-update` can pass through raw
 * requests unchanged.
 */
export type BatchUpdateRequest = Record<string, unknown>;

export interface BatchUpdateBody {
  requests: BatchUpdateRequest[];
  writeControl?: Record<string, string>;
}

/**
 * Structured segment location: either "end of segment" (append) or a specific
 * zero-based `index` within a segment. `segmentId` empty string means the
 * document body; non-empty targets a header/footer/footnote.
 */
export interface SegmentLocation {
  /** `body` | `header` | `footer` — determines whether `segmentId` is used. */
  insertSegment?: "body" | "header" | "footer";
  segmentId?: string;
  /** `endOfSegmentLocation` | `location`. */
  locationChoice?: "endOfSegmentLocation" | "location";
  index?: number;
}

/**
 * Convert the flattened w6w input shape into Google's nested `location` /
 * `endOfSegmentLocation` object, matching what n8n emits in `GoogleDocs.node.ts`.
 */
export function buildLocation(loc: SegmentLocation): Record<string, unknown> {
  const segmentId = loc.insertSegment && loc.insertSegment !== "body"
    ? (loc.segmentId ?? "")
    : "";
  const choice = loc.locationChoice ?? "endOfSegmentLocation";
  const inner: Record<string, unknown> = { segmentId };
  if (choice === "location" && loc.index !== undefined) {
    inner.index = loc.index;
  }
  return { [choice]: inner };
}
