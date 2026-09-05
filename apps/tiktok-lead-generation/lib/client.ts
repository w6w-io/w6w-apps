import type { HookContext } from "@w6w/types";

/**
 * Base host and path prefix, confirmed live 2026-09-05: every route below was
 * probed directly (with a syntactically-fake `Access-Token`) and answers
 * TikTok's own structured error envelope rather than a bare HTTP 404, which is
 * how a made-up path on this host actually looks (plain-text `Not Found`).
 */
export const API_BASE = "https://business-api.tiktok.com";
export const API_PREFIX = "/open_api/v1.3";

/**
 * TikTok's response envelope, confirmed live and cross-checked against the
 * `InlineResponse200` model in TikTok's own official SDK
 * (github.com/tiktok/tiktok-business-api-sdk, `swagger_types = {code, data,
 * message, request_id}`). `code === 0` is TikTok's documented success value;
 * anything else is an error, `data` describing the shape only for that case.
 */
export interface TikTokEnvelope<T = unknown> {
  code: number;
  message: string;
  request_id?: string;
  data: T;
}

export class TikTokApiError extends Error {
  constructor(public readonly code: number, message: string, public readonly requestId?: string) {
    super(message);
    this.name = "TikTokApiError";
  }
}

export interface RequestOptions {
  method?: string;
  query?: Record<
    string,
    string | number | boolean | undefined | null | Record<string, unknown> | unknown[]
  >;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets the `Access-Token` header itself —
 * the runtime routes every request through the auth `sign` hook, the only code
 * handed the credential.
 *
 * Object/array query values (TikTok's `filtering` and `fields` params) are
 * JSON-encoded, matching the convention used across the whole Marketing API —
 * see `ad_get` in TikTok's official SDK, whose `filtering` param is likewise a
 * JSON-encoded query string.
 */
export class TikTokClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      const encoded = typeof value === "object" ? JSON.stringify(value) : String(value);
      url.searchParams.set(key, encoded);
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: { accept: "application/json", ...options.headers },
    });

    let body: TikTokEnvelope<T>;
    try {
      body = await res.json() as TikTokEnvelope<T>;
    } catch {
      throw new Error(`TikTok returned a non-JSON response (HTTP ${res.status}) for ${path}`);
    }

    if (body.code !== 0) {
      throw new TikTokApiError(body.code, body.message, body.request_id);
    }
    return body.data;
  }
}
