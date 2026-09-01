import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.exa.ai";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Exa's own error envelope (`ErrorResponse` in the OpenAPI spec), returned on
 * every 4xx/5xx: `{ requestId, error, tag }`. `tag` is the machine-readable
 * classifier (e.g. `INVALID_API_KEY`, `NO_MORE_CREDITS`, `RATE_LIMIT_EXCEEDED`)
 * — never derive "is this credential valid?" from the HTTP status alone, read
 * `tag` instead. The set is explicitly open-ended (the spec's own words), so
 * unrecognised tags fall back to a generic error of the response's status.
 */
export interface ExaErrorBody {
  requestId?: string;
  error?: string;
  tag?: string;
}

export class ExaApiError extends Error {
  constructor(
    public status: number,
    public tag: string | undefined,
    public detail: string,
  ) {
    super(detail);
    this.name = "ExaApiError";
  }
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `x-api-key` — the runtime routes
 * the request through the auth `sign` hook, which injects that header (or the
 * `Authorization: Bearer` alternative Exa also accepts).
 */
export class ExaClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
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
    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text();

    if (!res.ok) {
      const body = (parsed && typeof parsed === "object" ? parsed : {}) as ExaErrorBody;
      const detail = body.error ?? (typeof parsed === "string" ? parsed : res.statusText);
      throw new ExaApiError(
        res.status,
        body.tag,
        `Exa ${res.status}${body.tag ? ` ${body.tag}` : ""} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    return parsed as T;
  }
}
