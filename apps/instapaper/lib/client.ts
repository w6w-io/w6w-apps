/**
 * Instapaper Full API client (`www.instapaper.com/api/1` and `/api/1.1`).
 *
 * Verified against `instapaper.com/developers` (the "Full Developer API"
 * reference — an older, `POST`-only, OAuth-1.0a-signed surface, distinct from
 * the "Simple API" for one-way bookmarking) via two archived snapshots seven
 * months apart (2026-01-30 and 2026-06-15, byte-identical aside from
 * whitespace), confirming the surface is stable rather than mid-migration.
 *
 * ## Three response shapes, not one
 *
 * Most methods answer a JSON **array** of tagged objects (`{"type": "bookmark", ...}`,
 * `{"type": "folder", ...}`, `{"type": "error", ...}`) — {@link InstapaperClient.call}.
 * `bookmarks/list` is the documented exception: it answers a bespoke object,
 * `{"user", "bookmarks", "highlights", "delete_ids"}` — {@link InstapaperClient.callObject}.
 * `bookmarks/get_text` is a second exception: it answers the bookmark's raw
 * `text/html` body with a bare 200, or the standard error array on failure —
 * {@link InstapaperClient.callText}.
 *
 * ## Every parameter is a POST body field, never a query string
 *
 * Stated directly in the docs' Overview: "All requests should be made via the
 * POST method, and all parameters should be passed in the POST request-body
 * and not in the query-string." This is not a style preference here — the
 * OAuth 1.0a signature base string is computed FROM the body params (see
 * `lib/oauth1.ts`), so a param sent as a query string would sign as absent
 * and Instapaper would see a body it never agreed to.
 *
 * ## Errors do not reliably use HTTP status
 *
 * The docs describe the error envelope (`[{"type":"error","error_code",...}]`)
 * without tying it to a specific non-2xx status, and separately say a
 * response that fails to parse as JSON should be treated as a 503 and
 * retried. So every call here parses the body first and classifies by its
 * *shape*, regardless of the HTTP status Instapaper happened to send.
 */
import type { HookContext } from "@w6w/types";

export const API_BASE = "https://www.instapaper.com";

export interface InstapaperErrorItem {
  type: "error";
  error_code: number;
  message: string;
}

export function isErrorArray(json: unknown): json is InstapaperErrorItem[] {
  return Array.isArray(json) && json.length > 0 &&
    typeof json[0] === "object" && json[0] !== null &&
    (json[0] as Record<string, unknown>).type === "error";
}

function truncate(text: string, max = 500): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a parsed (or unparseable) Instapaper response into one actionable
 * message. `error_code` is kept verbatim because the docs enumerate a fixed,
 * meaningful set (1040 rate-limited, 1041 premium required, 1220 needs
 * `content`, 1221 publisher opted out, …) and collapsing them to "request
 * failed" hides which one was hit.
 */
export function formatInstapaperError(
  status: number,
  path: string,
  json: unknown,
  raw: string,
): string {
  if (isErrorArray(json)) {
    const err = json[0];
    return `Instapaper error ${err.error_code} for ${path}: ${err.message}`;
  }
  return `Instapaper HTTP ${status} for ${path}: ${truncate(raw)}`;
}

export type InstapaperParams = Record<string, string | number | boolean | undefined | null>;

export class InstapaperClient {
  constructor(private ctx: HookContext) {}

  /** The standard tagged-array envelope: `[{"type": ..., ...}, ...]`. */
  async call<T = Record<string, unknown>>(
    path: string,
    params: InstapaperParams = {},
  ): Promise<T[]> {
    const { status, text } = await this.post(path, params);
    const json = this.parseJson(path, status, text);
    if (isErrorArray(json)) throw new Error(formatInstapaperError(status, path, json, text));
    if (!Array.isArray(json)) {
      throw new Error(
        `Instapaper returned an unexpected response shape for ${path} (HTTP ${status})`,
      );
    }
    return json as T[];
  }

  /** `bookmarks/list`'s bespoke object envelope. */
  async callObject<T = Record<string, unknown>>(
    path: string,
    params: InstapaperParams = {},
  ): Promise<T> {
    const { status, text } = await this.post(path, params);
    const json = this.parseJson(path, status, text);
    if (isErrorArray(json)) throw new Error(formatInstapaperError(status, path, json, text));
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      throw new Error(
        `Instapaper returned an unexpected response shape for ${path} (HTTP ${status})`,
      );
    }
    return json as T;
  }

  /**
   * For `highlights/<id>/delete`, whose docs state "Output: None" — tolerates
   * a genuinely empty body as success, rather than treating it as the
   * unparseable-JSON case {@link InstapaperClient.call} would.
   */
  async callVoid(path: string, params: InstapaperParams = {}): Promise<void> {
    const { status, text } = await this.post(path, params);
    const trimmed = text.trim();
    if (trimmed === "") return;
    const json = this.parseJson(path, status, text);
    if (isErrorArray(json)) throw new Error(formatInstapaperError(status, path, json, text));
  }

  /** `bookmarks/get_text`: raw HTML on a 200, the standard error envelope otherwise. */
  async callText(path: string, params: InstapaperParams = {}): Promise<string> {
    const { status, text } = await this.post(path, params);
    if (status === 200) return text;
    let json: unknown = undefined;
    try {
      json = JSON.parse(text);
    } catch {
      // Falls through to the generic HTTP-status message below.
    }
    throw new Error(formatInstapaperError(status, path, json, text));
  }

  private parseJson(path: string, status: number, text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      // Docs: "If the response is not valid JSON, it should be interpreted as
      // an HTTP 503 Service Temporarily Unavailable error, and the request
      // should be retried later."
      throw new Error(
        `Instapaper returned a non-JSON response for ${path} (HTTP ${status}) — treat as ` +
          "temporarily unavailable and retry later",
      );
    }
  }

  private async post(
    path: string,
    params: InstapaperParams,
  ): Promise<{ status: number; text: string }> {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") body.set(key, String(value));
    }
    const res = await this.ctx.fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return { status: res.status, text: await res.text() };
  }
}

/** A saved article, as returned by every bookmark method. Only the fields this app reads are typed; the rest pass through untouched. */
export interface InstapaperBookmark extends Record<string, unknown> {
  type: "bookmark";
  bookmark_id: number;
  url: string;
  title?: string;
}

export interface InstapaperFolder extends Record<string, unknown> {
  type: "folder";
  folder_id: number;
  title: string;
}

export interface InstapaperHighlight extends Record<string, unknown> {
  type: "highlight";
  highlight_id: number;
  bookmark_id: number;
  text: string;
  position: number;
  time: number;
}

export interface InstapaperUser extends Record<string, unknown> {
  type: "user";
  user_id: number;
  username: string;
}

export interface BookmarksListResponse {
  user?: InstapaperUser;
  bookmarks: InstapaperBookmark[];
  highlights?: InstapaperHighlight[];
  delete_ids?: number[];
}
