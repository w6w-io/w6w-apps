import type { HookContext } from "@w6w/types";

export const API_BASE = "https://rest.messagebird.com";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * JSON request body. MessageBird's REST API accepts `POST`/`PUT` payloads as
   * JSON (per the "Requests" section of the API reference) — an object here is
   * serialized and sent with `content-type: application/json`.
   */
  body?: Record<string, unknown>;
}

/** MessageBird's error envelope, returned on any non-2xx response. */
export interface MessageBirdErrorItem {
  code?: number;
  description?: string;
  parameter?: string;
}
export interface MessageBirdErrorBody {
  errors?: MessageBirdErrorItem[];
}

function describeError(status: number, body: unknown): string {
  const errors = (body as MessageBirdErrorBody | undefined)?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors
      .map((e) => e.description ?? (e.code !== undefined ? `error ${e.code}` : "unknown error"))
      .join("; ");
  }
  return `MessageBird returned ${status}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization directly — the
 * runtime routes the request through the auth `sign` hook, which injects
 * `Authorization: AccessKey {accessKey}`.
 */
export class MessageBirdClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const u = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        u.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(u.toString(), init);
    let parsed: unknown = undefined;
    const text = await res.text();
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      throw new Error(
        `MessageBird ${res.status} for ${options.method ?? "GET"} ${u.pathname}: ${
          describeError(res.status, parsed)
        }`,
      );
    }
    return parsed as T;
  }
}
