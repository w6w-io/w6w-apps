import type { HookContext } from "@w6w/types";

/**
 * Airparser Public API client (`api.airparser.com`).
 *
 * Everything in this module was verified on 2026-09-05 against Airparser's own
 * published documentation — `help.airparser.com/public-api/public-api`
 * (~132 KB, fetched directly) — plus live, unauthenticated probes against
 * `api.airparser.com`. There is no OpenAPI document; the article above is the
 * only API reference the vendor publishes, and every path, header, param and
 * response field this app uses is copied from it or measured on the wire, not
 * inferred from a third-party integration directory.
 *
 * ## One host, one auth header, no versioning
 *
 * `https://api.airparser.com` is the only base the article names. Every
 * request carries `X-API-Key: <key>` (see `auth/api-key.ts`); there is no
 * `/v1` or similar prefix in any documented path.
 *
 * ## The error body is Nest/Express's own shape, not Airparser's
 *
 * Every failure observed on the wire — a missing key, a wrong key, and an
 * unknown route — answers `{"statusCode": <n>, "message": "...", "error"?:
 * "..."}`, the default shape Nest.js's HTTP layer produces for an unhandled
 * exception. `formatAirparserError` reads it, but nothing here assumes the
 * vendor authored that shape on purpose, and validation-error bodies (a bad
 * schema, a missing required field) may carry additional fields this app has
 * no way to have seen without a live account.
 *
 * ## Finding: a missing key and a wrong key are IDENTICAL on the wire
 *
 * Measured 2026-09-05 against `GET /inboxes`:
 *
 *   | Request                          | Status | Body                                          |
 *   | --------------------------------- | ------ | ---------------------------------------------- |
 *   | No `X-API-Key` header at all       | 401    | `{"statusCode":401,"message":"Unauthorized"}`  |
 *   | `X-API-Key: totally-fake-key-123`  | 401    | `{"statusCode":401,"message":"Unauthorized"}`  |
 *
 * Byte-for-byte the same response (same `content-length`, same `etag`) in both
 * cases. Airparser's own docs only promise "the API returns HTTP 401
 * Unauthorized" for an unauthenticated request, and the wire confirms there is
 * no way to tell "no key reached the request" apart from "the key is wrong" —
 * `auth/api-key.ts`'s `test` hook says so rather than guessing which one
 * happened.
 *
 * ## Finding: two upload modes, two very different result shapes
 *
 * `POST /inboxes/{id}/upload-sync` waits (up to ~60s) and returns the parsed
 * document inline; `POST /inboxes/{id}/upload` returns immediately and the
 * result has to be fetched later via `GET /docs/{id}`. Sync mode does **not**
 * accept ZIP files; async mode does. Both cap at 20 MB. Getting the wrong verb
 * for a bulk ZIP import is silent on the surface (both endpoints accept a
 * `file` field) but sync mode will fail on ZIP.
 *
 * ## Finding: `schema` and `schema-clone` return a BARE boolean, not an object
 *
 * `POST /inboxes/{id}/schema` and `POST /inboxes/{id}/schema-clone` are
 * documented as returning `true` (or `false` for the clone) as the entire
 * response body — not `{"ok": true}` or similar. A caller that assumes every
 * JSON response is an object will throw on `.result` where there is no
 * `.result` to read; this app returns `{ updated: <bool> }` /
 * `{ cloned: <bool> }` from the two actions so a workflow gets a named field
 * either way.
 *
 * ## Finding: list filters with more than one value are UNDOCUMENTED on the wire
 *
 * `GET /inboxes/{id}/docs` documents a `status` parameter as "array of
 * document statuses" but shows no example of how an array is encoded in a
 * query string. This app sends it as a repeated `status=` query parameter
 * (`status=parsed&status=fail`), the conventional Express/Nest reading of an
 * array-typed query param — but it is inferred, not shown in the docs, and is
 * called out again at the call site in `actions/document-list.ts`.
 */

export const API_BASE = "https://api.airparser.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** A pre-built `FormData` (multipart upload). Content-type (with boundary) is left to `fetch`. */
  form?: FormData;
  headers?: Record<string, string>;
}

interface AirparserErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Airparser's (Nest-shaped) error body into one actionable line.
 *
 * `message` is sometimes a single string ("Unauthorized") and sometimes an
 * array of per-field validation messages (Nest's `class-validator` default) —
 * both are handled, since a body can genuinely have either shape depending on
 * what failed.
 */
export function formatAirparserError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: AirparserErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as AirparserErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed) return `Airparser ${status} for ${method} ${path}: ${truncate(raw)}`;

  const message = Array.isArray(parsed.message) ? parsed.message.join("; ") : parsed.message;
  const parts = [
    `Airparser ${status}${parsed.error ? ` ${parsed.error}` : ""} for ${method} ${path}`,
    message,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export class AirparserClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // See the module doc: the wire format for a repeated filter is not
        // shown in the vendor's docs. Repeated keys is the conventional
        // Express/Nest reading and is what this app sends.
        for (const item of v) {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(k, String(item));
          }
        }
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) {
      // Leave content-type to `fetch` — it must carry the multipart boundary.
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatAirparserError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
