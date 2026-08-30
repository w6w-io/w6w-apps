/**
 * Cognito Forms' REST API. Verified against the vendor's own OpenAPI document
 * (fetched 2026-08-30), which the REST API Reference page at
 * `https://www.cognitoforms.com/support/476/data-integration/cognito-forms-api/rest-api-reference`
 * loads client-side from `https://static.cognitoforms.com/api-reference/CognitoFormsOpenAPI.json` —
 * that JSON, not the HTML shell around it, is the source of truth this app was built from. Every
 * path, parameter, request/response shape and error `Type` below was read off that document.
 *
 * ## Host and auth
 *
 * The spec's one `servers` entry is `https://www.cognitoforms.com/api` — there is no separate
 * `api.` host. Confirmed live: an unsigned `GET /forms` answers
 * `{"Type":"AccessTokenNotProvided", ...}` and a garbage bearer token answers
 * `{"Type":"AccessTokenInvalid", ...}`, both over this same host.
 *
 * Auth is bearer: `Authorization: Bearer <token>`. The spec's `info.description` also documents an
 * `?access_token=` query-string fallback for systems that can't set custom headers, but the header
 * form is used here — it keeps the token out of URLs and request logs, and is what the vendor's own
 * "Manage API key settings" guide tells integrators to do ("Use this bearer token in the
 * Authorization header when making API requests").
 *
 * ## Response envelope
 *
 * Every response is `application/json` (the spec's top-level `produces`), including the file/document
 * endpoints, which embed the payload as base64 in a `Content` field rather than streaming raw bytes.
 * A success response is the bare resource — there is no wrapper. A failure response (400/401/403/404/
 * 409/429/500) is always the shape:
 *
 * ```json
 * { "Type": "EntryNotFound", "Message": "Entry not found.", "SupportCode": "ABC-123-DEF", "Data": null }
 * ```
 *
 * `Type` is the machine-readable discriminant — it separates cases an HTTP status code alone
 * conflates. Notably `MissingScope` (a live, authenticated token that simply lacks the scope this
 * call needs) is a 401 same as `AccessTokenInvalid` (a dead/garbage token), and only `Type` tells them
 * apart. `429` also carries a `Retry-After` response header (a datetime, not a delay in seconds).
 *
 * ## No list-entries endpoint
 *
 * The REST API has no "get many entries" operation — only `Get Entry` by a known `entryId`. Listing
 * or querying entries in bulk is the OData API's job (a separate reference, `CognitoFormsODataAPI`),
 * which this app does not cover. An entry ID here comes from a webhook, an import result, or another
 * system that already recorded it at submission time.
 */
import type { HookContext } from "@w6w/types";

export const API_URL = "https://www.cognitoforms.com/api";

/** The uniform error body every non-2xx Cognito Forms response carries. */
export interface CognitoFormsErrorBody {
  Type?: string;
  Message?: string;
  SupportCode?: string | null;
  Data?: unknown;
}

/** A Cognito Forms API error, carrying the vendor's own `Type`/`Data` alongside the HTTP status. */
export class CognitoFormsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string | undefined,
    public readonly supportCode: string | null | undefined,
    public readonly data: unknown,
    path: string,
    method: string,
    message: string,
  ) {
    super(`Cognito Forms ${status}${type ? ` (${type})` : ""} for ${method} ${path}: ${message}`);
  }
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON body — stringified with `content-type: application/json`. */
  body?: unknown;
  /** Multipart body (file upload, entry import) — passed through; fetch sets the boundary. */
  form?: FormData;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime routes every request
 * through the auth `sign` hook, which injects the bearer token.
 */
export class CognitoFormsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.headers ?? {}),
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.form !== undefined) {
      // Multipart — do NOT set content-type ourselves; fetch adds it with the boundary.
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (res.status === 204) return undefined as T;

    const text = await res.text();
    let parsed: unknown;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      const body = (parsed ?? {}) as CognitoFormsErrorBody;
      throw new CognitoFormsApiError(
        res.status,
        body.Type,
        body.SupportCode,
        body.Data,
        url.pathname,
        (init.method ?? "GET").toUpperCase(),
        body.Message ?? (text ? text.slice(0, 200) : res.statusText),
      );
    }

    return parsed as T;
  }
}

/**
 * Decode a base64 string (with or without a `data:` prefix) into an ArrayBuffer suitable for
 * wrapping in a `Blob` for multipart upload.
 */
export function base64ToBytes(input: string): ArrayBuffer {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned);
  const buffer = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buffer;
}
