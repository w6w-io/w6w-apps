import type { HookContext } from "@w6w/types";

/** `servers[0].url` in OnceHub's own OpenAPI 3.1 document — the `/v2` segment is part of the base. */
export const API_URL = "https://api.oncehub.com/v2";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Vendor error shape, verified against `components.schemas.Error` and every
 * documented `4xx`/`5xx` example in the spec:
 *
 *   { "type": "authentication_error" | "invalid_request_error"
 *            | "rate_limit_error" | "api_error",
 *     "message": string,
 *     "param"?: string }
 *
 * `type` — not the HTTP status — is what a caller should branch on: a 401 is
 * always `authentication_error`, a 429 is always `rate_limit_error`, but a
 * plain 400/404/409/422 all share `invalid_request_error` and are
 * distinguished only by `message`/`param`.
 */
export interface OnceHubError {
  type?: string;
  message?: string;
  param?: string;
}

/**
 * Thin wrapper over `ctx.fetch` for the OnceHub API v2. Never sets the
 * `API-Key` header itself — the runtime routes every request through the
 * `api-key` auth `sign` hook, which stamps it on (see `../auth/api-key.ts`).
 *
 * Every list endpoint returns `{ object: "list", data: [...], has_more }`
 * (cursor pagination via `before`/`after`/`limit`, not page numbers) — see
 * https://help.oncehub.com/developers/overview/pagination/. `request` does
 * not paginate on the caller's behalf; it returns exactly one page.
 */
export class OnceHubClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
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
      const detail = await res.json().catch(() => undefined) as OnceHubError | undefined;
      const message = detail?.message ?? res.statusText;
      const type = detail?.type ? ` (${detail.type})` : "";
      const param = detail?.param ? ` [param: ${detail.param}]` : "";
      throw new Error(
        `OnceHub ${res.status}${type} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${message}${param}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
