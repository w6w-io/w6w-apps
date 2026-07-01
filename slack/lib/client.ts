import type { HookContext } from "@w6w/types";

export const API_URL = "https://slack.com/api";

/**
 * Slack Web API returns `{ ok: true, ... }` on success and `{ ok: false, error: "..." }`
 * on failure — even with HTTP 200. We treat `ok: false` as a hard error and surface the
 * Slack-provided `error` code (plus `needed` scope hint when present) as an Error.
 */
export interface SlackResponse {
  ok?: boolean;
  error?: string;
  needed?: string;
  response_metadata?: { next_cursor?: string; messages?: string[] };
  [key: string]: unknown;
}

export type SlackContentType =
  | "application/json; charset=utf-8"
  | "application/x-www-form-urlencoded";

export interface RequestOptions {
  method?: string;
  /** Query string params (appended to the URL). */
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Object → serialized per `contentType`. When absent, no body is sent.
   * Nested arrays/objects are stringified as JSON when form-encoding (matching
   * the n8n Slack node's behavior, which is what the Slack Web API expects for
   * `blocks`/`attachments`).
   */
  body?: Record<string, unknown>;
  /** JSON is the default. Use form for endpoints that require it (e.g. files.upload with text). */
  contentType?: SlackContentType;
  /**
   * Send as `multipart/form-data`. When set, `body` is ignored — provide a
   * pre-built `FormData` instance. Used for `files.upload*` binary streams.
   */
  formData?: FormData;
}

/**
 * Wraps `ctx.fetch` for Slack Web API calls. Auth injection happens in the
 * auth `sign` hook — this client never sets Authorization directly.
 */
export class SlackClient {
  constructor(private ctx: HookContext) {}

  async request<T extends SlackResponse = SlackResponse>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: {},
    };

    if (options.formData) {
      // Let the runtime set the multipart boundary — do NOT set content-type.
      init.body = options.formData;
    } else if (options.body !== undefined) {
      const contentType = options.contentType ?? "application/json; charset=utf-8";
      (init.headers as Record<string, string>)["content-type"] = contentType;
      if (contentType === "application/x-www-form-urlencoded") {
        init.body = encodeForm(options.body);
      } else {
        init.body = JSON.stringify(options.body);
      }
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Slack ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }

    // Slack always returns JSON except for a couple of endpoints that redirect
    // to file uploads. `files.getUploadURLExternal` and `files.completeUploadExternal`
    // still return JSON. For the actual PUT upload to the returned URL, the response
    // is plain text ("OK") — callers using that path skip this method.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      // Return an ok-shaped object so downstream `.ok` checks pass.
      return { ok: true, raw: await res.text() } as unknown as T;
    }
    const data = await res.json() as T;
    if (data.ok === false) {
      const scopeHint = data.needed ? ` (needed scopes: ${data.needed})` : "";
      throw new Error(`Slack API error: ${data.error ?? "unknown_error"}${scopeHint}`);
    }
    return data;
  }
}

/**
 * Slack form-encodes bodies with a quirk: nested arrays/objects (e.g. `blocks`,
 * `attachments`) are serialized as JSON strings, not `[]` notation. Primitive
 * numbers/booleans coerce to their string form; `undefined`/`null`/`""` are dropped.
 */
export function encodeForm(body: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object") {
      params.append(k, JSON.stringify(v));
    } else {
      params.append(k, String(v));
    }
  }
  return params.toString();
}
