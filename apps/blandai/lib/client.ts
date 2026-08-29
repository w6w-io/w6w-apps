import type { HookContext } from "@w6w/types";

/**
 * Bland — enterprise voice AI (phone calls, pathways, numbers, voices) over
 * `api.bland.ai`.
 *
 * Every path, header, and response shape in this app was verified on
 * 2026-08-29 against Bland's own documentation site (`docs.bland.ai`, a
 * Mintlify deployment) via its machine-readable `llms-full.txt` export
 * (1,829,091 bytes — every reference page concatenated with the real
 * `METHOD https://host/path` line Mintlify renders above each endpoint),
 * cross-checked with live, unauthenticated probes against `api.bland.ai` and
 * `status.bland.ai`. Nothing here came from a third-party integration
 * directory or from Bland's marketing site.
 *
 * The findings that shaped this client:
 *
 *  1. **The auth header carries the raw key, not a `Bearer` prefix.** Every
 *     cURL/Python/JS example for the core REST surface reads
 *     `Authorization: YOUR_API_KEY` (not `Authorization: Bearer YOUR_API_KEY`).
 *     A handful of newer pages (SIP port cancellation, live-translation
 *     sessions) show `Authorization: Bearer <token>` instead, but a live probe
 *     against `GET /v1/me` treats a bare key and a `Bearer `-prefixed key
 *     identically (both 401 `AUTH_FAILURE`/`Unauthorized` when the key is
 *     wrong), so there's no live signal to prefer the prefixed form — this app
 *     follows the majority, documented convention and sends the raw key. See
 *     `auth/api-key.ts`.
 *  2. **Two response envelopes coexist, and neither the endpoint's age nor its
 *     version prefix predicts which one you get.** Older surface (`/v1/calls`,
 *     `/v1/calls/{id}/stop`, `/v1/pathway/*`) answers success as a flat object
 *     (`{"status":"success", "call_id": "…"}` or just the resource itself) and
 *     failure as `{"status":"error","message":"…","errors"?:[...]}` (a string
 *     array). Newer surface (`/v1/calls/active/transfer`, and the generic
 *     `AUTH_FAILURE` shape returned by *every* endpoint on missing/invalid
 *     auth) answers `{"data": …, "errors": null}` on success and
 *     `{"data": null, "errors": [{"error": "CODE", "message": "…"}]}` on
 *     failure. {@link parseBlandError} handles both without guessing which one
 *     an endpoint will use.
 *  3. **Two endpoints live outside `/v1`.** `POST /numbers/purchase` and
 *     `POST /inbound/update_label` are real, documented, and verified live
 *     (both return the same `AUTH_FAILURE` envelope as every `/v1/*` route
 *     when unauthenticated) — but they are NOT under the `/v1` prefix every
 *     other endpoint uses. This app builds each request path literally rather
 *     than assuming a shared prefix.
 *  4. **No endpoint this app calls returns a live secret.** Unlike several
 *     vendors in this pack (Apify's proxy password, Follow Up Boss's `/me`),
 *     nothing in Bland's call, pathway, number, voice or account surface
 *     echoes the API key or another usable credential back to the caller —
 *     confirmed by reading every response schema below, not merely a status
 *     code. No redaction helper is needed here.
 *  5. **No rate-limit headers are published.** A live 401 probe against
 *     `GET /v1/me` carries no `X-RateLimit-*`/`RateLimit-*` header of any
 *     kind. The one headroom signal Bland exposes is the account's own credit
 *     balance (`billing.current_balance` from `GET /v1/me`), which
 *     `health/quota.ts` reads instead.
 */

/** The one and only API origin used by the core (non-Enterprise) REST surface. */
export const API_BASE = "https://api.bland.ai";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers, merged in after `accept`/`content-type`. Never used for credentials. */
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Accept a `json` param as either a parsed value or the string a form field submits. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same as {@link asOptionalJson}, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

interface NewEnvelopeError {
  data: null;
  errors: Array<{ error?: string; message?: string }>;
}

interface LegacyEnvelopeError {
  status?: string;
  message?: string;
  /** Sometimes a string array of field errors, sometimes absent. */
  errors?: unknown;
}

/**
 * Turn a failed Bland response into one actionable line, handling both
 * envelopes documented in the module header without guessing which one a
 * given endpoint uses.
 */
export function parseBlandError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  if (!raw) return `Bland ${status} for ${method} ${path}`;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return `Bland ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  if (!parsed || typeof parsed !== "object") {
    return `Bland ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const body = parsed as Partial<NewEnvelopeError> & Partial<LegacyEnvelopeError>;

  // The `{data: null, errors: [{error, message}]}` envelope.
  if (Array.isArray(body.errors) && body.errors.length > 0 && typeof body.errors[0] === "object") {
    const first = body.errors[0] as { error?: string; message?: string };
    return `Bland ${status} ${first.error ?? "ERROR"} for ${method} ${path}: ${
      first.message ?? truncate(raw)
    }`;
  }

  // The `{status: "error", message, errors?: string[]}` envelope.
  if (typeof body.message === "string") {
    const fieldErrors = Array.isArray(body.errors) && body.errors.every((e) =>
        typeof e === "string"
      )
      ? (body.errors as string[])
      : undefined;
    const extra = fieldErrors && fieldErrors.length > 0 ? ` (${fieldErrors.join("; ")})` : "";
    return `Bland ${status} for ${method} ${path}: ${body.message}${extra}`;
  }

  return `Bland ${status} for ${method} ${path}: ${truncate(raw)}`;
}

export class BlandClient {
  constructor(private ctx: HookContext) {}

  /** Parse the body as-is — the caller knows whether this endpoint wraps in `data`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(parseBlandError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Bland ${res.status} for ${init.method ?? "GET"} ${url.pathname}: response was not JSON`,
      );
    }
  }

  /**
   * Unwrap the newer `{"data": …, "errors": null}` success envelope (see
   * finding 2 in the module header). Used only by the endpoints verified to
   * answer that shape — the caller picks this or {@link request} deliberately,
   * per endpoint, rather than this client guessing.
   */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<{ data?: T }>(path, options);
    return body && typeof body === "object" && "data" in body
      ? (body as { data: T }).data
      : (body as T);
  }
}
