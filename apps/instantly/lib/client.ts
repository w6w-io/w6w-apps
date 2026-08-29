import type { HookContext } from "@w6w/types";

/**
 * Instantly API v2 REST client.
 *
 * Everything in this module was verified on 2026-08-29 against Instantly's own
 * machine-readable OpenAPI 3.0 document (`api.instantly.ai/openapi/api_v2.json`,
 * 4,221,761 bytes, `info.version` `2.0.0`, 184 paths), the prose pages linked
 * from `developer.instantly.ai/llms.txt`, and live probes against
 * `api.instantly.ai`. Nothing here came from a third-party integration
 * directory.
 *
 * ## One host, one prefix, one envelope
 *
 * The OpenAPI document declares a single server, `https://api.instantly.ai`,
 * and every path carries the `/api/v2` prefix. Unlike some vendors in this
 * pack, Instantly does not wrap successful responses in an envelope: a `GET`
 * returns the entity (or `{items, next_starting_after}` for a list) directly,
 * and a `POST`/`PATCH`/`DELETE` that mutates a single resource returns that
 * resource verbatim — `DELETE /accounts/{email}` answers with the now-deleted
 * `Account`, not a bare status.
 *
 * ## Errors are always `{statusCode, error, message}`
 *
 * Confirmed live: an unauthenticated request answers
 * `401 {"statusCode":401,"error":"Unauthorized","message":"Missing authorization header"}`,
 * and a syntactically-plausible-but-wrong bearer token answers
 * `401 {"statusCode":401,"error":"Unauthorized","message":"Invalid API key"}` —
 * two different problems the vendor already distinguishes by `message`, which
 * {@link formatInstantlyError} preserves rather than collapsing to "HTTP 401".
 * A `402` means the workspace has no active paid plan; a `429` means the
 * workspace-wide rate limit was hit (see `health/rate-limit.ts`).
 *
 * ## Cursor pagination, not offset/limit
 *
 * Every list endpoint pages with `limit` (max 100) and an opaque
 * `starting_after` cursor, echoed back as `next_starting_after` — there is no
 * `total` and no page number. `starting_after` is "the ID of the last item in
 * the previous page", so a caller loops by feeding one response's
 * `next_starting_after` into the next request's `starting_after` until the
 * field is absent. `listAccount`'s cursor is a special case: the vendor
 * documents it as a compound `timestamp_created&email` string (still opaque
 * — round-trip it, never parse it).
 *
 * ## Scoped API keys are the norm, not the exception
 *
 * Instantly's own key-creation UI requires the caller to tick individual
 * scopes (`campaigns:read`, `leads:all`, `all:read`, …) — there is no
 * unscoped key. A request whose key lacks the scope a route needs is refused,
 * and the vendor's docs literally name the required scopes in each endpoint's
 * own description. This app never assumes an `all:*` key: see
 * `auth/api-key.ts` for how the health probe was chosen with that in mind.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.instantly.ai";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The cursor-paginated list envelope every list endpoint returns. */
export interface InstantlyListPage<T> {
  items: T[];
  next_starting_after?: string;
}

interface InstantlyErrorBody {
  statusCode?: number;
  error?: string;
  message?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive — `include_all_emails=false` and `limit=0` are both
 * meaningful — so only `undefined`, `null` and `""` are dropped.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json`-typed param through in whichever shape it arrived,
 * so both are handled here rather than at each call site.
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

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Normalise a `multiselect`/comma-list param into an array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Instantly's error body into one actionable line.
 *
 * `error` is the HTTP reason phrase ("Unauthorized", "Not Found", "Payment
 * Required") and `message` is the specific reason, which is what actually
 * distinguishes a missing header from a revoked key from an out-of-scope key.
 * Collapsing to a bare status code is how those three get reported as one
 * indistinguishable "401".
 */
export function formatInstantlyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: InstantlyErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as InstantlyErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const hint = status === 429
    ? "the workspace hit Instantly's shared rate limit (100 req/s, 6000 req/min, shared with " +
      "API v1); retry with backoff"
    : status === 402
    ? "the workspace has no active paid plan"
    : undefined;

  if (!parsed?.message && !parsed?.error) {
    const parts = [`Instantly ${status} for ${method} ${path}: ${truncate(raw)}`, hint];
    return truncate(parts.filter(Boolean).join(": "), 1000);
  }

  const parts = [
    `Instantly ${status} ${parsed.error ?? "error"} for ${method} ${path}`,
    parsed.message,
    hint,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class InstantlyClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body of a request. Used by every action. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — no endpoint in this app's surface answers with an empty body on success. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // The vendor documents repeated-key arrays ("add the same parameter
        // multiple times"), e.g. `?ids=123&ids=456` — not one comma-joined value.
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
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
        formatInstantlyError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
