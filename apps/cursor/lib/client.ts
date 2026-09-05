import type { HookContext } from "@w6w/types";

/**
 * Cursor Admin API REST client (`api.cursor.com`).
 *
 * Verified 2026-09-05 directly against `cursor.com/docs/account/teams/admin-api`
 * (endpoints, request/response shapes) and `cursor.com/docs/api` (auth, rate
 * limits, error taxonomy) — both fetched live, not inferred from a third-party
 * integration directory or from other AI-vendor admin APIs.
 *
 * ## One host, Basic auth, no envelope
 *
 * Every documented path lives under `https://api.cursor.com`, there is no
 * regional host, and — unlike most REST APIs in this pack — responses are
 * plain JSON objects with no `{"data": …}` wrapper. `DELETE` endpoints answer
 * `204 No Content`.
 *
 * ## Error shapes are NOT one shape
 *
 * The general API doc documents `{"error": "<Title>", "message": "<detail>"}`
 * for standard 4xx/5xx (`docs/api#common-error-responses`), but two corners of
 * the *same* Admin API disagree, confirmed on the actual documented response
 * bodies:
 *
 *  - `POST /teams/remove-member` answers `{"error": "User is not a member of
 *    this team"}` — the descriptive text is IN the `error` field, no separate
 *    `message`.
 *  - The model-access routes and the 429 rate-limit response both answer
 *    `{"code": "error", "message": "…"}` — a `code` field instead of `error`.
 *
 * {@link formatCursorError} reads whichever of `message` / `error` / `code` is
 * actually a string, rather than assuming one fixed shape.
 */

export const API_BASE = "https://api.cursor.com";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface CursorErrorBody {
  /** Either a short title (`"Unauthorized"`) or, on `remove-member`, the full message. */
  error?: unknown;
  message?: unknown;
  /** Used instead of `error` by the model-access routes and the 429 response. */
  code?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a Cursor error body into one actionable line, tolerant of the three
 * documented shapes (see module doc above).
 */
export function formatCursorError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: CursorErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as CursorErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || typeof parsed !== "object") {
    return `Cursor ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const message = typeof parsed.message === "string" ? parsed.message : undefined;
  const label = typeof parsed.error === "string"
    ? parsed.error
    : typeof parsed.code === "string"
    ? parsed.code
    : undefined;

  const retryHint = status === 429
    ? " — rate limited; back off (Retry-After header names the wait, in seconds)"
    : "";

  if (message && label && message !== label) {
    return `Cursor ${status} ${label} for ${method} ${path}: ${message}${retryHint}`;
  }
  if (message) return `Cursor ${status} for ${method} ${path}: ${message}${retryHint}`;
  if (label) return `Cursor ${status} for ${method} ${path}: ${label}${retryHint}`;
  return `Cursor ${status} for ${method} ${path}: ${truncate(raw)}${retryHint}`;
}

export class CursorClient {
  constructor(private ctx: HookContext) {}

  /** Parsed JSON body. `undefined` for a `204 No Content` or an empty body. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
      throw new Error(formatCursorError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  /** Returns `undefined` — every documented `DELETE` in this app answers `204`. */
  delete<T = undefined>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "DELETE", body });
  }
}

/** Path-escape a caller-supplied resource id (group id, repo id, provider/model id). */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Normalise a `multiselect` (array) or comma-separated string param into a
 * comma-joined query value, matching how `users` / `eventTypes` are
 * documented on `GET /teams/audit-logs`.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}
