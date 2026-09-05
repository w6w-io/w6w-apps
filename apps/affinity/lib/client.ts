import type { HookContext } from "@w6w/types";

/**
 * Affinity API v1 client (`api.affinity.co`).
 *
 * Everything in this module was verified on 2026-09-05 against Affinity's own
 * API reference (`api-docs.affinity.co`, 481,906 bytes, titled "Affinity V1
 * API Reference") plus live probes against `api.affinity.co`. Nothing came
 * from a third-party integration directory.
 *
 * ## V1, not "V1 vs V2"
 *
 * The reference document covers exactly one API generation. Its own
 * introduction says so directly: "The latest Affinity API (v2) can be found
 * at https://developer.affinity.co. **The v2 API is not at feature parity
 * with v1** — we are continuing to develop new v2 APIs to support all v1
 * functionality over time." Every endpoint this app calls — lists, list
 * entries, fields, field values, persons, organizations, opportunities,
 * notes, webhooks, whoami, rate-limit — is a v1 endpoint. There is no
 * documented v2 replacement for any of them here, so this app targets v1,
 * which is also the vendor's own recommendation until v2 reaches parity.
 *
 * What *does* come in two forms is authentication, not the API generation:
 * the docs show the identical v1 endpoints authenticated two ways —
 * `Authorization: Bearer <key>` or HTTP Basic with an empty username and the
 * key as the password — and say both work for every request. This app uses
 * Bearer (see `auth/bearer-token.ts` for why).
 *
 * ## Errors are not always JSON, despite the docs
 *
 * The reference states "Responses to each request are provided as a JSON
 * object. The response is either the data requested, or a valid error
 * message and error code." Measured live on 2026-09-05, that is false for at
 * least authentication failures and unknown routes: an invalid/missing key
 * against `GET /auth/whoami` returns `401` with body `Unauthorized API Key.`
 * under `content-type: text/html;charset=utf-8` — plain text, not JSON — and
 * an unknown path returns `404` with body `Unknown API endpoint`, also plain
 * text. {@link formatAffinityError} therefore always falls back to the raw
 * text rather than assuming a parse will succeed.
 *
 * ## Pagination is not uniform
 *
 * `GET /lists`, `GET /fields`, `GET /field-values`, and the global-fields
 * endpoints (`/persons/fields`, `/organizations/fields`) answer a bare JSON
 * array with no pagination at all. `GET /persons`, `GET /organizations`,
 * `GET /opportunities`, `GET /notes` and `GET /lists/{id}/list-entries`
 * (only when `page_size` is passed) answer an envelope object keyed by the
 * resource name plus `next_page_token`, a cursor to pass back as
 * `page_token`. Getting this wrong either misreads a bare array as an object
 * or fails to see `next_page_token` on the envelope shape.
 */

export const API_BASE = "https://api.affinity.co";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface AffinityErrorLike {
  error?: string;
  message?: string;
}

/**
 * Turn an Affinity error response into one actionable line.
 *
 * Tries JSON first (some validation errors on other Affinity endpoints are
 * documented as `{"error": "..."}`-shaped), falling back to the raw text —
 * required because 401s and 404s are measured to be plain text (see module
 * docs above), not the JSON object the reference claims for every response.
 */
export function formatAffinityError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: AffinityErrorLike | null = null;
  try {
    parsed = JSON.parse(raw) as AffinityErrorLike;
  } catch { /* not JSON — the common case for 401/404 */ }

  const detail = parsed?.error ?? parsed?.message ?? raw;
  const trimmed = detail.length > 600 ? `${detail.slice(0, 600)}… (truncated)` : detail;
  const suffix = status === 429
    ? "; Affinity rate-limits per user-per-minute and per-org-per-month — see the quota health check"
    : "";
  return `Affinity ${status} for ${method} ${path}: ${trimmed}${suffix}`;
}

/** `{success: true}` — the documented body of every DELETE. */
export interface SuccessBody {
  success: boolean;
}

export class AffinityClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response body. Used by every endpoint except DELETE. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `DELETE` endpoints all answer `{"success": true}`. */
  delete(path: string): Promise<SuccessBody> {
    return this.json<SuccessBody>(path, { method: "DELETE" });
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
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
      throw new Error(formatAffinityError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/** Drop keys the caller left unset, so an optional query param is truly absent. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/**
 * Accept a `json`-typed param as either an already-parsed value or the
 * string a user typed into the form. The host hands a `json` param through
 * in whichever shape it arrived, so both are handled here rather than at
 * each call site.
 */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Parse a `field-values` `value` param, whose required shape depends on the
 * *target field*'s `value_type` — a plain string for Text, a number for
 * Number, an object for Location, or a dropdown option id for Ranked
 * Dropdown. Unlike {@link asJson}, a string that is not itself valid JSON is
 * not an error here — it is exactly the plain-text case (e.g. `Architecture`
 * for a Text field), so it is kept as the literal string rather than
 * rejected for failing to parse as JSON.
 */
export function asFieldValue<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

/** Parse a comma-separated or array-typed id list into `number[]`. */
export function toIdList(v: string[] | string | number[] | undefined | null): number[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const raw = Array.isArray(v) ? v : String(v).split(",");
  const ids = raw.map((x) => Number(String(x).trim())).filter((n) => Number.isFinite(n));
  return ids.length ? ids : undefined;
}

/**
 * Parse a comma-separated or array-typed list into a trimmed `string[]`.
 * Returns `[]` (not `undefined`) for an explicitly empty input, because
 * Affinity's `emails` field on Create/Update Person requires an explicit
 * `[]` rather than the key's absence to mean "no emails".
 */
export function toStringList(v: string[] | string | undefined | null): string[] {
  if (v === undefined || v === null || v === "") return [];
  const raw = Array.isArray(v) ? v : String(v).split(",");
  return raw.map((s) => String(s).trim()).filter(Boolean);
}
