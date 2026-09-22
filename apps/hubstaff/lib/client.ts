import type { HookContext } from "@w6w/types";

/**
 * Hubstaff API v2 client.
 *
 * Every path, verb, query parameter and body field in this app was taken from
 * Hubstaff's own OpenAPI 2.0 document at <https://api.hubstaff.com/v2/docs>
 * (fetched 2026-09-22, 510,300 bytes, `info.version` `2.0`, 135 paths) plus the
 * rendered reference pages under <https://developer.hubstaff.com/>. Live probes
 * against `api.hubstaff.com` and `status.hubstaff.com` confirmed the auth and
 * error behaviour described below. Nothing here came from a third-party
 * integration directory.
 *
 * ## Authentication is not done here
 *
 * This client never sets an `Authorization` header. The runtime routes each
 * request through the auth `sign` hook, which stamps
 * `Authorization: Bearer hsoat_…` — the whole credential story for an
 * Organization access token. No action ever sees the secret.
 *
 * ## Errors come in two shapes, and the HTTP status does not tell them apart
 *
 * Both were observed live on 2026-09-22, and both are `401`:
 *
 * | Probe | Status | Body |
 * | ----- | ------ | ---- |
 * | no `Authorization` header | 401 | `{"code":"not_authorized","error_code":10001,"error":"unauthorized","error_description":null}` |
 * | `Bearer hsoat_not_a_real_token_zzz` | 401 | `{"error":"invalid_token","error_description":"The access token provided is expired, revoked, malformed or invalid for other reasons."}` |
 *
 * The second shape carries **no** `code` and **no** `error_code` — only the
 * OAuth-style `error`/`error_description` pair, mirrored in a
 * `WWW-Authenticate: Bearer … error="invalid_token"` response header. So this
 * app classifies credentials from the body's own machine-readable fields
 * ({@link HubstaffErrorBody}), never from the status code, and never assumes
 * that a 401 in one shape means the same thing as a 401 in the other.
 *
 * ## Pagination is a cursor, and the OpenAPI document does not declare it
 *
 * List endpoints take `page_start_id` (default `0`) and `page_limit` (default
 * `100`, max `500`). The prose guide
 * (<https://developer.hubstaff.com/pagination-rate-limits/>) states that each
 * response "includes a `pagination` object with the next `page_start_id` if
 * more pages are available", and one Insights operation description spells the
 * path out as `pagination.next_page_start_id`. The OpenAPI document's list
 * response schemas declare only the resource array and omit `pagination`
 * entirely — which is why every list output here declares
 * `pagination.next_page_start_id` and the field is documented as
 * vendor-prose-verified rather than schema-verified.
 *
 * ## Array query parameters are comma-separated
 *
 * The document's `type: "array"` query parameters (`status`, `user_ids`,
 * `project_ids`, `include`, …) carry no `collectionFormat`, so Swagger 2.0's
 * default applies: `csv`. A list is written as one comma-joined value, never as
 * a repeated key.
 */

/** The single documented host. */
export const API_BASE = "https://api.hubstaff.com";

/** Every path in this app is under the v2 tree. */
export const API_PREFIX = "/v2";

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `include_removed=false` and `page_start_id=0` are
 * both meaningful, and silently dropping them would make them impossible to
 * express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Normalise a multi-valued filter into one comma-separated string, or leave it
 * unset.
 *
 * Every list endpoint in this app takes its arrays as a single CSV query value
 * (see the header), so the form fields are text and this is where that stays
 * true for a caller that passed a real array instead.
 */
export function csvList(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const parts = Array.isArray(value) ? value : String(value).split(",");
  const items = parts.map((v) => String(v).trim()).filter(Boolean);
  return items.length > 0 ? items.join(",") : undefined;
}

/**
 * Hubstaff's error body. Every field is optional because the vendor uses two
 * different subsets of it — see the file header.
 */
export interface HubstaffErrorBody {
  /** Legacy string code, e.g. `not_authorized`. Absent on the `invalid_token` shape. */
  code?: string;
  /** Numeric code for i18n/programmatic routing; ranges are documented per family. */
  error_code?: number;
  /** Human-readable message, or the OAuth-style error slug (`invalid_token`). */
  error?: string;
  error_description?: string | null;
  /** Per-attribute validation errors: `[{attribute, error}]`. */
  details?: unknown;
}

function truncate(text: string, max = 1000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Render an error response as one line a workflow author can act on.
 *
 * The message carries only Hubstaff's own prose and the caller's own path; the
 * credential never enters this module.
 */
export function formatHubstaffError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: HubstaffErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HubstaffErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.error && !parsed.code)) {
    return `Hubstaff ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const code = parsed.code ?? parsed.error;
  const parts = [
    `Hubstaff ${status} ${code} for ${method} ${path}`,
    parsed.error_description ?? undefined,
    parsed.error && parsed.error !== code ? parsed.error : undefined,
    status === 429
      ? "Hubstaff rate-limits per access token (120 requests/minute by default, lower on " +
        "activities and screenshots); retry after the Retry-After header"
      : undefined,
    status >= 500 ? "Hubstaff server error; retry with exponential backoff" : undefined,
  ].filter((p): p is string => typeof p === "string" && p.length > 0);

  return truncate(parts.join(": "));
}

export class HubstaffClient {
  constructor(private ctx: HookContext) {}

  /**
   * Parse the body of one request.
   *
   * Hubstaff wraps a single resource as `{"project": {…}}` and a collection as
   * `{"projects": […]}`, so the body is returned whole — the envelope is part of
   * the contract a workflow author reads, not noise to strip.
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    // `DELETE /v2/teams/{id}` is the only 204 in the covered surface, and it is
    // not exposed here; an empty body is still never a JSON parse error.
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** The raw response, for the one check that reads headers rather than a body. */
  async response(path: string, options: RequestOptions = {}): Promise<Response> {
    return await this.send(path, options);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatHubstaffError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
