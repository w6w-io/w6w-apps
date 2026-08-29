import type { HookContext } from "@w6w/types";

/** Confirmed live 2026-08-29 against `https://openrouter.ai/openapi.json` (`servers[0].url`). */
export const API_URL = "https://openrouter.ai/api/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes
 * the request through the auth `sign` hook, which injects the Bearer header.
 */
export class OpenRouterClient {
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
    if (!res.ok) {
      const detail = await extractError(res);
      throw new Error(
        `OpenRouter ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * OpenRouter's error body is `{ error: { code, message, metadata? } }` on
 * every endpoint (confirmed against `openrouter.ai/docs/api_reference/errors-and-debugging`
 * and the `ErrorResponse` schema in `openrouter.ai/openapi.json`). Falls back
 * to the raw text when a response doesn't match, rather than hiding it.
 */
export async function extractError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as {
      error?: { message?: string; code?: number; metadata?: Record<string, unknown> };
    };
    if (body?.error?.message) {
      const errorType = body.error.metadata?.error_type;
      return errorType ? `${body.error.message} (${errorType})` : body.error.message;
    }
  } catch {
    // not JSON — fall through to the raw text
  }
  return text;
}
