import type { HookContext } from "@w6w/types";

/**
 * Telnyx API v2.
 *
 * Verified 2026-09-05 against Telnyx's own public OpenAPI 3 document
 * (`https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json`,
 * `info.version` `2.0.0`, ~6.7 MB). It declares exactly one server —
 * `https://api.telnyx.com/v2` — and `security: [{ bearerAuth: [] }]` globally, so
 * every request in this app is a plain `Authorization: Bearer <api key>` call
 * against that one host and version prefix.
 *
 * ## Envelope
 *
 * Every read/write action in this app answers `{"data": {...}}`; list actions
 * answer `{"data": [...], "meta": {...}}`. Errors are JSON:API-shaped —
 * `{"errors": [{"code","title","detail"}]}` — and the SAME shape and the SAME
 * auth-failure code (`10009`, "Authentication failed") repeats across every
 * namespace checked (`call-control_Errors`, `numbers_Errors`,
 * `messaging_Errors`), which is what `auth/api-key.ts#test` reads instead of
 * trusting the HTTP status alone.
 *
 * ## Pagination and filtering use `deepObject` query style
 *
 * List endpoints (`GET /phone_numbers`) take `page[size]`, `page[number]` and
 * `filter[<field>]` — OpenAPI's `deepObject` style, not flat query params. A
 * bracketed key handed straight to `URLSearchParams` encodes correctly
 * (`page%5Bsize%5D=1`), so callers just pass the literal bracketed key; there is
 * no separate nested object to build.
 */
export const API_BASE = "https://api.telnyx.com/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Flat query params — bracketed keys (`"page[size]"`) encode as `deepObject`. */
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

export interface TelnyxErrorDetail {
  code?: string;
  title?: string;
  detail?: string;
}

export interface TelnyxErrorBody {
  errors?: TelnyxErrorDetail[];
}

/** Render Telnyx's `{ errors: [...] }` envelope into one readable line. */
export function describeTelnyxErrors(body: unknown): string | undefined {
  const errors = (body as TelnyxErrorBody | undefined)?.errors;
  if (!errors || errors.length === 0) return undefined;
  return errors
    .map((e) => [e.code && `#${e.code}`, e.title, e.detail].filter(Boolean).join(" "))
    .join("; ");
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization directly — the
 * runtime routes the request through the auth `sign` hook, which injects the
 * bearer token from the credential.
 */
export class TelnyxClient {
  constructor(private ctx: HookContext) {}

  /** Full parsed JSON body (the `{"data": ...}` / `{"data": ..., "meta": ...}` envelope, verbatim). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
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
    const text = await res.text();
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const detail = describeTelnyxErrors(parsed);
      throw new Error(
        `Telnyx ${res.status} ${res.statusText} for ${init.method} ${url.pathname}${
          detail ? `: ${detail}` : ""
        }`,
      );
    }
    return parsed as T;
  }

  /** Unwraps the single-resource `{"data": ...}` envelope. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<{ data: T }>(path, options);
    return body.data;
  }
}
