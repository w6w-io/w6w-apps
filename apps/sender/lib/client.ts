import type { HookContext } from "@w6w/types";

/**
 * Sender (sender.net) API v2 REST client.
 *
 * Everything in this module was verified on 2026-09-05 against Sender's own
 * documentation site, `api.sender.net` — a real Astro/Starlight site (confirmed
 * via its sitemap, `api.sender.net/sitemap-0.xml`, 74 distinct endpoint pages,
 * byte-diffed against a bogus path to rule out a catch-all SPA shell). Nothing
 * here came from a third-party integration directory.
 *
 * ## The soft-fallback-200 trap
 *
 * `api.sender.net` answers an UNKNOWN path with HTTP 200 and its own homepage,
 * not a 404. `curl -I https://api.sender.net/definitely-not-a-real-page` is a
 * 200. That means "does this path respond?" proves nothing about whether an
 * endpoint exists — every path implemented here was instead checked against
 * the sitemap's own documentation page for that exact endpoint and its worked
 * request/response example, never against path liveness.
 *
 * ## One host, one prefix, one shape (mostly)
 *
 * There is exactly one documented server, `https://api.sender.net`, and every
 * documented path carries the `/v2` prefix. Most success responses answer
 * `{"data": …}`, optionally alongside Laravel-style `links`/`meta` pagination
 * envelopes (see `pagination/`) — but several documented endpoints answer
 * WITHOUT a `data` wrapper at all:
 *
 *  - **Delete subscriber** (`DELETE /v2/subscribers`) answers
 *    `{"message": "...", "delete_instance": "..."}` — no `data`, no `success`.
 *  - **Get subscriber's events** (`GET /v2/subscribers/{id}/events`) answers a
 *    bare object keyed by channel (`email`, `sms`, `temail`, …) — no envelope.
 *  - **Get campaign errors** (`GET /v2/campaigns/{id}/errors`) answers
 *    `{"errors": [...], "warnings": [...]}` — no `data`, no `success`.
 *  - Most mutating actions (create/delete/rename) answer only
 *    `{"success": true, "message": "..."}`, sometimes with a `data` object
 *    describing the affected resource and sometimes without one at all.
 *
 * So {@link SenderClient.data} unwraps a `data` key **only when present**,
 * returning the parsed body verbatim otherwise — matching every documented
 * shape above without guessing which endpoints carry the envelope.
 *
 * ## Errors
 *
 * The vendor documents four shapes, all carrying a top-level `message`:
 *
 *  - `400` — `{"success": false, "message": "..."}`
 *  - `401` — no worked example given; classified by the presence of a
 *    `message` field and the status code, never assumed to be one exact string.
 *  - `404` — undocumented body shape.
 *  - `422` — `{"message": "The given data was invalid.", "errors": {"field": ["..."]}}`
 *
 * {@link formatSenderError} surfaces the top-level `message` plus any
 * field-level `errors`, because a flattened "HTTP 422" hides which field
 * failed validation.
 *
 * ## Rate limits
 *
 * The `errors/` page documents `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
 * `X-RateLimit-Reset` and `Retry-After` under its "429 - Too many requests"
 * section — the vendor's own docs do not state whether these headers are also
 * present on ordinary (non-429) responses. `health/quota.ts` reads them
 * opportunistically and reports `unknown` rather than assuming they are always
 * there.
 */

/** The one and only documented API origin. */
export const API_BASE = "https://api.sender.net";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

/** Laravel-style pagination envelope, present on every list endpoint. */
export interface SenderLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
}

export interface SenderMeta {
  current_page?: number;
  from?: number | null;
  last_page?: number;
  path?: string;
  per_page?: number;
  to?: number | null;
  total?: number;
}

export interface SenderListPage<T> {
  data: T[];
  links?: SenderLinks;
  meta?: SenderMeta;
  has_more_resources?: boolean;
  has_more_not_deleted_subscribers?: boolean;
}

interface SenderErrorBody {
  message?: string;
  success?: boolean;
  errors?: Record<string, string[]>;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive, since both are
 * meaningful values a caller may deliberately send.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Normalise a `multiselect` param (or a comma-separated string a user typed)
 * into a plain string array.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Sender's error body into one actionable line.
 *
 * Every documented error shape carries a top-level `message`; `errors`
 * (a field -> messages map) is appended when present, because "422" alone
 * hides which field failed validation.
 */
export function formatSenderError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: SenderErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SenderErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (parsed.message === undefined && parsed.errors === undefined)) {
    return `Sender ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const fieldErrors = parsed.errors
    ? Object.entries(parsed.errors).map(([field, msgs]) => `${field}: ${msgs.join(", ")}`).join(
      "; ",
    )
    : undefined;

  const parts = [
    `Sender ${status} for ${method} ${path}`,
    parsed.message,
    fieldErrors,
    status === 429
      ? "Sender rate-limits per minute; see Retry-After / X-RateLimit-Reset and back off"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class SenderClient {
  constructor(private ctx: HookContext) {}

  /**
   * Unwraps a top-level `data` key when present; returns the parsed body
   * verbatim otherwise. Safe for both enveloped and un-enveloped endpoints —
   * see the module doc for which is which.
   */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<Record<string, unknown>>(path, options);
    if (body && typeof body === "object" && "data" in body) return body.data as T;
    return body as unknown as T;
  }

  /** Parse the body without unwrapping. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // Standard PHP/Laravel array-query convention. The vendor's own docs
        // show a bracket-literal example (`?ids=[x]`) for one endpoint without
        // stating the wire encoding; repeated `key[]=` entries is the format
        // Laravel's query parser actually accepts.
        for (const item of v) url.searchParams.append(`${k}[]`, item);
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatSenderError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
