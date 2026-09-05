import type { HookContext } from "@w6w/types";

/**
 * JustCall API v2.1 REST client.
 *
 * Every path, verb, parameter and response schema referenced here was read off
 * the per-endpoint OpenAPI 3.0 document embedded in JustCall's own ReadMe-hosted
 * reference (`developer.justcall.io/reference/*`, fetched 2026-09-05) plus a live
 * unauthenticated probe against `api.justcall.io`. JustCall publishes no single
 * combined OpenAPI file — each reference page carries its own `paths` + fenced
 * `components.schemas` block, and this app was built by reading every one of the
 * pages it covers individually rather than guessing from the prose.
 *
 * ## One host, one version prefix
 *
 * Every operation's `servers` entry is `https://api.justcall.io`, and every path
 * carries the `/v2.1` prefix. `v2.0` is documented as **Deprecated** on the
 * vendor's own version-history page — nothing here targets it.
 *
 * ## The envelope is not one shape, and the docs do not agree with themselves
 *
 * JustCall's own per-endpoint schemas disagree about what a response looks
 * like, and this is the single easiest way to misread this API:
 *
 *  - **List** endpoints (`GET /calls`, `GET /contacts`, `GET /texts`, `GET
 *    /phone-numbers`, `GET /users`, `GET /webhooks`) answer
 *    `{status, data: [...], count, current_page, per_page, next_page_link,
 *    prev_page_link}` — confirmed from each list endpoint's own named response
 *    schema (`ListContactsResponseDto`, `SmsListApiResponseDto`, …).
 *  - **Get-one** (`GET /contacts/{id}`) answers `{status, data: {...}}` — a
 *    single object, per `GetContactResponse`.
 *  - **Create and update contact** (`POST /contacts`, `PUT /contacts`) answer
 *    `{status, data: [{...}]}` — `data` is an **array containing the one
 *    contact**, per `CreateContactResponseDTO` / `UpdateContactResponseDto`,
 *    not a bare object the way `GET /contacts/{id}` returns it.
 *  - **Delete contact and update-status** answer a bare `{status}` with no
 *    `data` at all.
 *  - **Get-one call / get-one text / send SMS / check-reply** each document
 *    their 200 schema as the item type itself (`CallResponse21DTO`, `TextDTO`)
 *    with no visible `status`/`data` wrapper in the fenced schema — which is
 *    either a real difference from the contacts/phone-numbers/users family, or
 *    an artefact of how the reference site authors its per-endpoint OpenAPI
 *    fragment. This app has no live account to confirm which, so
 *    {@link unwrap} handles both: if the parsed body carries a `status` +
 *    `data` envelope, `data` is returned; otherwise the body is returned as-is.
 *    Every action's `output` is documented as "the shape JustCall's schema
 *    names," not as a guaranteed top-level key.
 *
 * ## Auth is a raw `key:secret` pair, not Basic auth
 *
 * The vendor's own security scheme description: *"The API key can be put in
 * the Authorization header. i.e `Authorization: api_key:api_secret`"* — the two
 * credentials joined by a literal colon, sent **unencoded** in the header. This
 * looks exactly like HTTP Basic auth's `user:pass` pairing but is **not**
 * Base64-encoded the way Basic auth requires; sending
 * `Authorization: Basic <base64(key:secret)>` is a different, wrong header that
 * JustCall does not document accepting. See `auth/api-key.ts`.
 *
 * ## Errors
 *
 * Measured live (unauthenticated and with a fabricated credential, both against
 * `GET /v2.1/users`, 2026-09-05): every failure is `{"status":"failed",
 * "message": "..."}` with a 4xx/5xx status and **no distinguishing body between
 * a missing and a rejected credential** — both come back as
 * `{"status":"failed","message":"Unauthorized"}`. So `sign` and `test` cannot
 * tell "never sent" apart from "sent and wrong" the way some other vendors let
 * an app do; {@link formatJustCallError} surfaces the vendor's message text
 * verbatim rather than inventing a distinction the API does not make.
 *
 * ## Rate limits
 *
 * Real, plan-dependent, and read from response headers documented at
 * `docs/rate-limits.md`: `X-Rate-Limit-{Limit,Remaining,Reset}` (hourly) and
 * `X-Rate-Limit-Burst-{Limit,Remaining,Reset}` (per-minute). Both windows were
 * **absent** on the always-401 responses this app could probe live (no test
 * account credentials were available) — `health/quota.ts` treats a response
 * that carries neither pair as `unknown`, not as evidence of zero quota.
 */

/** The one and only API origin. Every operation's `servers` entry names it. */
export const API_BASE = "https://api.justcall.io";

/** Every documented path in this app carries this prefix; `v2.0` is deprecated. */
export const API_PREFIX = "/v2.1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The envelope most list/get endpoints document. */
export interface JustCallEnvelope<T> {
  status?: string;
  message?: string;
  data?: T;
  count?: number;
  current_page?: number;
  per_page?: number;
  next_page_link?: string;
  prev_page_link?: string;
  total_count?: number;
  total_texts?: number;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive — `available=false` and `page=0` are both meaningful
 * query values, and dropping them silently would make them unreachable.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/array param into a list, accepting a comma-joined string too. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
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
 * Unwrap the `{status, data}` envelope when present, otherwise return the body
 * unchanged. See the module doc's "the envelope is not one shape" section for
 * why this is defensive rather than a single hard-coded shape.
 */
export function unwrap<T = unknown>(body: unknown): T {
  if (
    body && typeof body === "object" && !Array.isArray(body) &&
    "data" in (body as Record<string, unknown>) &&
    "status" in (body as Record<string, unknown>)
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * Turn JustCall's error body into one readable line.
 *
 * Every observed failure is `{"status":"failed","message":"..."}`, and the
 * vendor's own `message` is kept verbatim because it is the only signal this
 * API gives — see the module doc's "Errors" section for why a missing and a
 * rejected credential cannot be told apart here.
 */
export function formatJustCallError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: { status?: string; message?: string } | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) return `JustCall ${status} for ${method} ${path}: ${truncate(raw)}`;
  const rateLimit = status === 429
    ? " (JustCall rate-limits per hour and per minute; see the X-Rate-Limit-* response headers)"
    : "";
  return truncate(`JustCall ${status} for ${method} ${path}: ${parsed.message}${rateLimit}`, 1000);
}

/** The `X-Rate-Limit-*` pair the vendor documents for one window (hourly or burst). */
export interface RateLimitWindow {
  limit: number;
  remaining: number;
  /** Unix epoch seconds. */
  reset: number;
}

/** Read both documented rate-limit windows off a response's headers, when present. */
export function readRateLimitHeaders(
  headers: Headers,
): { hourly?: RateLimitWindow; burst?: RateLimitWindow } {
  const num = (name: string): number | undefined => {
    const v = headers.get(name);
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const hLimit = num("x-rate-limit-limit");
  const hRemaining = num("x-rate-limit-remaining");
  const hReset = num("x-rate-limit-reset");
  const bLimit = num("x-rate-limit-burst-limit");
  const bRemaining = num("x-rate-limit-burst-remaining");
  const bReset = num("x-rate-limit-burst-reset");

  const hourly = hLimit !== undefined && hRemaining !== undefined
    ? { limit: hLimit, remaining: hRemaining, reset: hReset ?? 0 }
    : undefined;
  const burst = bLimit !== undefined && bRemaining !== undefined
    ? { limit: bLimit, remaining: bRemaining, reset: bReset ?? 0 }
    : undefined;
  return { hourly, burst };
}

/**
 * Unwrap `{status, data}` the way {@link unwrap} does, then take the first
 * element if `data` turned out to be an array.
 *
 * `POST /contacts` and `PUT /contacts` document their `data` as **an array
 * containing the one contact**, not a bare object the way `GET /contacts/{id}`
 * returns it — see the module doc. An action that creates or updates exactly
 * one contact returns that one contact, not a one-element array, so callers
 * don't have to know which endpoints wrap this way and which don't.
 */
export function unwrapOne<T = unknown>(body: unknown): T {
  const data = unwrap<T | T[]>(body);
  return Array.isArray(data) ? data[0] : data as T;
}

export class JustCallClient {
  constructor(private ctx: HookContext) {}

  /** Parse the body and unwrap the `{status, data}` envelope when present. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body } = await this.json<unknown>(path, options);
    return unwrap<T>(body);
  }

  /** Like {@link JustCallClient.data}, but unwraps a one-element `data` array too. */
  async dataOne<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body } = await this.json<unknown>(path, options);
    return unwrapOne<T>(body);
  }

  /** Parse the body without unwrapping, and hand back the response's headers too. */
  async json<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ body: T; headers: Headers }> {
    const res = await this.send(path, options);
    const text = res.status === 204 ? "" : await res.text();
    const body = text ? JSON.parse(text) : undefined;
    return { body: body as T, headers: res.headers };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
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
      throw new Error(
        formatJustCallError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
