import type { HookContext } from "@w6w/types";

/**
 * Retell AI REST client — `api.retellai.com`.
 *
 * Verified 2026-08-24 against Retell's own machine-readable OpenAPI 3.1
 * document (`docs.retellai.com/openapi.yaml`, 13,058 lines, Mintlify docs
 * site) plus live probes against `api.retellai.com`. Nothing here came from a
 * third-party integration directory.
 *
 * ## One host, no version prefix on the host — but three path shapes
 *
 * The document declares exactly one server, `https://api.retellai.com`. There
 * is no `/v1` root the way most REST APIs have one; instead every path
 * embeds its own generation directly: some carry `/v2/...` or `/v3/...`
 * (`v2/create-phone-call`, `v3/list-calls`), most carry none at all
 * (`/create-batch-call`, `/get-concurrency`, `/list-voices`). A path's prefix
 * is not a version of the *whole* API — `/v2/create-phone-call` and
 * `/create-batch-call` are both current, live endpoints today — so this
 * client takes the full path verbatim from each action rather than
 * concatenating a shared prefix.
 *
 * ## Two error envelopes, not one — the finding that would cost a day
 *
 * The OpenAPI document's `components.responses` describes every 4xx/5xx as
 * `{"status": "error", "message": "..."}`, and that IS what the API returns
 * for a well-formed-but-wrong request (bad body, wrong resource) and for an
 * **invalid** API key — confirmed live:
 *
 *   `curl -H "Authorization: Bearer wrong" .../get-concurrency`
 *   → 401 `{"status":"error","message":"Invalid API Key."}`
 *
 * But a request with **no** `Authorization` header at all answers a
 * completely different, UNDOCUMENTED shape — also confirmed live on the same
 * day, against three different endpoints:
 *
 *   `curl .../get-concurrency`  (no header)
 *   → 401 `{"error_message":"Authorization header required"}`
 *
 * A caller that only checks `body.message` (matching the spec) silently
 * treats a missing-credential response as an unreadable error, because the
 * field it is reading does not exist on that shape. `formatRetellError`
 * below reads both.
 *
 * ## Pagination is not one convention
 *
 * `v3/list-calls` puts `limit`, `sort_order`, `pagination_key` AND
 * `filter_criteria` all in the POST body, and its schema explicitly forbids
 * sending both `skip` and `pagination_key` on the same request (`"not":
 * {"required": ["skip", "pagination_key"]}` — a JSON Schema way of saying
 * "pick one"). `v2/list-agents` and `v2/list-phone-numbers`, despite being
 * newer-looking `/v2/` paths, take `limit`/`sort_order`/`pagination_key` as
 * QUERY parameters instead — `list-agents` is a POST whose pagination lives
 * in the query string while its *filter* lives in the JSON body, a genuine
 * split most integrations get wrong on the first attempt. `list-voices` is a
 * third shape again: no envelope, no cursor, just a bare JSON array — there
 * is no page 2, the vendor returns everything.
 */
export const API_BASE = "https://api.retellai.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. Presence implies POST. */
  body?: unknown;
}

interface RetellDocumentedError {
  status?: string;
  message?: string;
}

interface RetellUndocumentedError {
  error_message?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as T;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Retell's error body into one actionable line, reading BOTH documented
 * shapes — see the module doc comment for why a single-shape reader misses
 * the missing-Authorization-header case entirely.
 */
export function formatRetellError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (RetellDocumentedError & RetellUndocumentedError) | null = null;
  try {
    parsed = JSON.parse(raw) as RetellDocumentedError & RetellUndocumentedError;
  } catch { /* not JSON — fall through to the raw body */ }

  if (parsed?.error_message) {
    return `Retell ${status} for ${method} ${path}: ${parsed.error_message}`;
  }
  if (parsed?.message) {
    return `Retell ${status} for ${method} ${path}: ${parsed.message}`;
  }
  return `Retell ${status} for ${method} ${path}: ${truncate(raw)}`;
}

export class RetellClient {
  constructor(private ctx: HookContext) {}

  /** Issue one request and parse the JSON body. Throws {@link formatRetellError} on a non-2xx. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatRetellError(res.status, method, url.pathname, detail));
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
