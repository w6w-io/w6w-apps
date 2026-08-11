import type { HookContext } from "@w6w/types";

/**
 * TidyCal REST API client.
 *
 * Every path, verb, parameter and body field in this app was verified on
 * 2026-08-11 against TidyCal's **own OpenAPI 3.0 document** plus live
 * unauthenticated probes of `tidycal.com`. Nothing came from a third-party
 * integration directory.
 *
 * ## Where the reference actually lives
 *
 * `https://tidycal.com/developer/docs/` looks like one enormous HTML page
 * (1,351,149 bytes, md5 `7c21f07a20e52c573787fa403baf7f97`) because it is a
 * **Redoc bundle**: the renderer and the specification are inlined into a single
 * document. The machine-readable source is the `__redoc_state` JSON blob near
 * the end of it — `spec.data` is a complete OpenAPI 3.0.0 document with 18
 * operations and 9 component schemas. Reading the rendered prose instead of that
 * blob is the slow way to do this.
 *
 * There is no `/developer/docs/bookings`-style sub-page: those return a real,
 * distinct 404 (7,975 bytes), so the single page genuinely is the whole
 * reference rather than a catch-all shell.
 *
 * ## One host, and it is the marketing host
 *
 * The document declares exactly one server, and it is **protocol-relative**:
 *
 *     "servers": [{ "url": "//tidycal.com/api" }]
 *
 * `new URL("//tidycal.com/api")` throws, and a code generator that pastes it
 * verbatim emits an `http://` request — which really does happen: plain HTTP
 * answers `302` to `https://tidycal.com:443/...` (measured). So the base is
 * pinned here as an absolute `https://` URL, once.
 *
 * Note the host: **`tidycal.com`, not `api.tidycal.com`** — the latter does not
 * resolve at all (NXDOMAIN, measured). The API shares an origin with the
 * marketing site and the public booking pages, which is what makes the 404
 * behaviour below so confusing.
 *
 * ## An unknown endpoint does not 404 like an API
 *
 * `tidycal.com/api/<anything-unknown>` at one path segment falls through the API
 * router into the site's public vanity-URL route and answers:
 *
 *     HTTP/2 404
 *     {"message": "No query results for model [App\\Models\\User] api"}
 *
 * That is Laravel failing to bind a *User* — it reads like "your account is
 * gone" and has nothing to do with the account. A deeper unknown path
 * (`/api/booking-types/1/questions`) answers the ordinary
 * `{"message": "The route ... could not be found."}`. Both are distinguishable
 * from the `{"message":"Unauthenticated."}` a real endpoint returns unsigned,
 * which is how every route in this app was confirmed to exist without a
 * credential — see `health/api.ts`.
 *
 * ## The response envelope is inconsistent, so nothing is unwrapped here
 *
 * Read straight off the document's `responses`:
 *
 *  - collection reads (`/bookings`, `/booking-types`, `/contacts`, `/teams`,
 *    the three team collections) and every create answer `{"data": …}`;
 *  - **single-resource reads answer the bare entity** — `GET /bookings/{id}`,
 *    `GET /me` and `GET /teams/{id}` are `$ref: Booking | User | Team` with no
 *    wrapper, and so is the `PATCH …/cancel` response;
 *  - the two team-membership writes answer neither: `{"message", "team_user_id"}`
 *    and `{"message"}`.
 *
 * A client that unwraps `data` unconditionally therefore returns `undefined`
 * for the whoami. Rather than guess a normalisation that cannot be confirmed
 * without a paid credential, **every action returns the vendor's parsed body
 * verbatim** and each action's `output` states the shape the document declares.
 * That also means Laravel pagination metadata passes through untouched if it is
 * present — the document declares only `data`, and this app does not assert it
 * is the only key.
 *
 * ## Errors
 *
 * Laravel's conventional shape: `{"message": "…"}`, plus `{"errors": {field:
 * [messages]}}` on a 422. {@link formatTidyCalError} keeps the field names,
 * because "the booking type has no such question" and "your slug is taken" both
 * arrive as a bare 422 without them.
 *
 * ## Rate limits
 *
 * None published and none on the wire — see `health/quota.ts`.
 */

/**
 * The one and only API origin, expanded from the document's protocol-relative
 * `//tidycal.com/api`.
 */
export const API_BASE = "https://tidycal.com";

/** Every documented path hangs off this prefix. */
export const API_PREFIX = "/api";

/** `https://tidycal.com/api` — the base every request is built from. */
export const API_URL = `${API_BASE}${API_PREFIX}`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface TidyCalErrorBody {
  message?: string;
  errors?: Record<string, string[] | string>;
  error?: string;
  error_description?: string;
}

/** Keep an error message readable — a 422 validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Every TidyCal path parameter is documented as an `integer`, but the value
 * reaching an action is whatever a workflow put in the field, so a `/` or `?`
 * pasted into it must not escape its segment. `encodeURIComponent` is enough:
 * there is no `~`-style addressing form in this API to preserve.
 */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Render a boolean query parameter.
 *
 * `false` is **not** dropped. TidyCal documents three distinct states for
 * `cancelled` on the team-bookings endpoint — "true for cancelled bookings,
 * false for non-cancelled bookings, or omit for all bookings" — so collapsing
 * `false` into absence would make one of the three unreachable. `"true"` /
 * `"false"` are the spellings PHP's `FILTER_VALIDATE_BOOLEAN` reads, which is
 * what Laravel's boolean casting is built on.
 */
export function flag(v: boolean | undefined | null): string | undefined {
  if (v === undefined || v === null) return undefined;
  return v ? "true" : "false";
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
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

/** Drop keys the caller left unset, so an empty field never reaches the API. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Turn a Laravel error body into one actionable line.
 *
 * The per-field `errors` map is flattened into the message because TidyCal's
 * documented failure modes are otherwise indistinguishable: `POST /contacts`
 * answers `402` when the account lacks a lifetime subscription,
 * `POST /booking-types/{id}/bookings` answers `409` when the slot is gone and
 * `422` when a booking question is wrong, and every one of them is a bare
 * status code plus a sentence unless the field names come along.
 *
 * The message can carry only TidyCal's own prose and the caller's own input;
 * the credential never enters this module.
 */
export function formatTidyCalError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TidyCalErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TidyCalErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed) return truncate(`TidyCal ${status} for ${method} ${path}: ${raw}`);

  const parts: string[] = [`TidyCal ${status} for ${method} ${path}`];
  const message = parsed.message ?? parsed.error_description ?? parsed.error;
  if (message) parts.push(message);

  const fields = parsed.errors;
  if (fields && typeof fields === "object") {
    const detail = Object.entries(fields)
      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(" ") : msgs}`)
      .join("; ");
    if (detail) parts.push(detail);
  }

  if (status === 401) {
    parts.push(
      'TidyCal answers 401 {"message":"Unauthenticated."} for both a missing and a rejected ' +
        "token — reconnect if this persists",
    );
  }
  return truncate(parts.join(": "), 1000);
}

export class TidyCalClient {
  constructor(private ctx: HookContext) {}

  /**
   * The parsed body, verbatim.
   *
   * Nothing is unwrapped: see the envelope note in this module's header. A
   * 204 or an empty body becomes `undefined` rather than a parse error.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_URL}${path}`);
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
        formatTidyCalError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
