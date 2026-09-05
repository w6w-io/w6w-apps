import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.pdfmonkey.io/api/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets the `Authorization` header — the
 * runtime routes every request through the auth `sign` hook, which injects
 * `Authorization: Bearer <key>` (see `docs/api/authentication`).
 */
export class PdfMonkeyClient {
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
    // DELETE returns 204 No Content with an empty body.
    if (res.status === 204) return undefined as T;

    const contentType = res.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      throw new Error(
        `PDFMonkey ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${formatError(parsed)}`,
      );
    }
    return parsed as T;
  }
}

/**
 * PDFMonkey reports errors two different ways depending on the failure:
 * an `{"errors": [{status, title, detail}, ...]}` array (e.g. 401
 * Unauthorized) or an `{"errors": {field: ["message", ...]}}` object keyed by
 * attribute (422 Unprocessable Entity validation failures). Normalize both
 * into one readable string.
 */
function formatError(parsed: unknown): string {
  if (parsed && typeof parsed === "object" && "errors" in parsed) {
    const errors = (parsed as { errors: unknown }).errors;
    if (Array.isArray(errors)) {
      return errors
        .map((e) =>
          e && typeof e === "object" && "detail" in e
            ? String((e as { detail: unknown }).detail)
            : JSON.stringify(e)
        )
        .join("; ");
    }
    if (errors && typeof errors === "object") {
      return Object.entries(errors as Record<string, unknown>)
        .map(([field, msgs]) => `${field} ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`)
        .join("; ");
    }
  }
  return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
}
