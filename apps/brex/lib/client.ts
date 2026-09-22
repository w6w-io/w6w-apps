import type { HookContext } from "@w6w/types";

/**
 * Brex Team API v1.0 REST client.
 *
 * Everything in this module was verified on 2026-09-22 against Brex's own
 * machine-readable OpenAPI bundle (`developer.brex.com/openapi/team_api.md` and
 * the per-endpoint pages it links, e.g. `.../team_api/users/listusers.md`) plus
 * live probes against `api.brex.com`. Nothing came from a third-party
 * integration directory.
 *
 * ## One host, one prefix
 *
 * The OpenAPI document declares two servers, `https://api.brex.com` and
 * `https://api-staging.brex.com`, and labels the second "not a sandbox. It will
 * not work with customer tokens." So there is exactly one usable origin and it
 * is not derived from the credential, and the staging host appears nowhere in
 * this app — not in the manifest's egress allowlist, not in a default.
 *
 * Every documented path carries the `/v2` prefix.
 *
 * ## Cursor pagination, and a limit that is a hard ceiling
 *
 * Brex's pagination guide: `limit` defaults to 100, may not exceed 1000, and a
 * value above 1000 is a `400`. `cursor` is opaque and omitted for the first
 * page. Every list answers `{"next_cursor": "string | null", "items": [ ... ]}`
 * — lowercase snake_case, and `next_cursor` is `null` at the end of the set.
 *
 * {@link BrexClient.list} keeps those vendor names rather than renaming them,
 * because Brex itself does not normalize: users, locations, departments and
 * cards are snake_case, while a legal entity's `displayName`/`billingAddress`/
 * `createdAt`/`isDefault` and a company's `accountType` are camelCase. Renaming
 * one envelope and passing the other through would be worse than copying both
 * verbatim, so a field name in a workflow result is the field name in Brex's
 * docs.
 *
 * ## Errors: `{type, message, code?}`
 *
 * Every failure carries a body with `type`, `message` and an optional `code`.
 * {@link formatBrexError} surfaces all three verbatim, because the fix differs
 * per code and a flattened "HTTP 403" hides which one you hit.
 *
 * ## What the wire actually does — measured 2026-09-22
 *
 *   | Request                                        | Answer                                        |
 *   | ---------------------------------------------- | --------------------------------------------- |
 *   | `GET /v2/users/me` with no credential           | `401`, **empty body**, no rate-limit header   |
 *   | `GET /v2/users/me` with a syntactically valid but fake token | `403` `{"type":"FORBIDDEN","message":"Invalid or Revoked Token"}` |
 *
 * Two things follow, and both are load-bearing elsewhere:
 *
 *  1. **`403` is overloaded.** Brex's error-codes page documents `403` as
 *     "Expired token", and the live probe above shows `403` for an invalid one
 *     as well. `auth/api-token.ts` therefore classifies from the BODY, never
 *     from the status code alone.
 *  2. **There is no rate-limit header.** Not `X-RateLimit-*`, not `Retry-After`,
 *     not on either response. `health/quota.ts` declares that absence instead of
 *     inventing a number.
 */

/** The only production origin the OpenAPI document declares. */
export const API_BASE = "https://api.brex.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

/**
 * `GET /v2/users/me` — the whoami, and the shared half of both credential-side
 * and action-side reads.
 *
 * It is used by three call sites that must not drift: `auth/api-token.ts`'s
 * `test` and `afterConnect` (which hold the credential and stamp the header
 * themselves, inside the auth sandbox) and `actions/user-get-current.ts` (which
 * sends no auth header at all — the runtime routes it through `sign`). The path
 * is one constant and the query is built by one function so the three always
 * address the same resource; only who stamps the header differs.
 */
export const CURRENT_USER_PATH = "/users/me";

/** Brex's documented maximum. Anything above it is a `400`, so nothing may send more. */
export const MAX_PAGE_LIMIT = 1000;

/** Brex's documented default when `limit` is omitted. */
export const DEFAULT_PAGE_LIMIT = 100;

/**
 * The optional idempotency header on every mutating call.
 *
 * Lowercase because that is how it goes on the wire and how a host logs it;
 * HTTP header names are case-insensitive, so this is presentation only.
 */
export const IDEMPOTENCY_HEADER = "idempotency-key";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /**
   * Forwarded verbatim as the `Idempotency-Key` request header when the caller
   * set one. The app never synthesises a value of its own — see
   * `lib/params.ts#idempotencyKeyParam`.
   */
  idempotencyKey?: string;
}

/** Brex's list envelope, under the vendor's own field names. */
export interface ListPage<T> {
  items: T[];
  /** `null` at the end of the set, exactly as Brex documents it. */
  next_cursor: string | null;
  /** Rows in THIS page. Brex publishes no total, so this is never one. */
  count: number;
}

/** A user, as every users endpoint returns it. */
export interface BrexUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status?: string | null;
  manager_id?: string | null;
  department_id?: string | null;
  location_id?: string | null;
  title_id?: string | null;
  cost_center_id?: string | null;
  legal_entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  remote_display_id?: string | null;
  custom_fields?: Array<{ key: string; value: unknown }> | null;
}

/** A location or a department: identical shapes, `description` optional. */
export interface BrexNamedResource {
  id: string;
  name: string;
  description?: string | null;
}

/** A title carries no description. */
export interface BrexTitle {
  id: string;
  name: string;
}

/** `{amount, currency}` — amount is in the currency's smallest unit (USD cents). */
export interface BrexMoney {
  amount: number;
  currency?: string | null;
}

/** `spend_controls`, present only on cards whose `limit_type` is `CARD`. */
export interface BrexSpendControls {
  spend_limit?: BrexMoney | null;
  spend_available?: BrexMoney | null;
  spend_duration?: string | null;
  reason?: string | null;
  lock_after_date?: string | null;
  allowed_merchant_details?: Array<{ name: string }> | null;
  blocked_merchant_details?: Array<{ name: string }> | null;
}

/** A card. `owner` is passed through verbatim — Brex resolves it as a schema ref. */
export interface BrexCard {
  id: string;
  owner: Record<string, unknown>;
  status?: string | null;
  last_four: string;
  card_name?: string | null;
  card_type?: string | null;
  limit_type: string;
  spend_controls?: BrexSpendControls | null;
  billing_address?: Record<string, unknown> | null;
  mailing_address?: Record<string, unknown> | null;
  expiration_date?: { month: number; year: number } | null;
  has_been_transferred?: boolean | null;
  metadata?: Record<string, unknown> | null;
  budget_id?: string | null;
  partner?: string | null;
  created_at?: string | null;
}

/** A legal entity — camelCase fields, unlike the rest of this API. */
export interface BrexLegalEntity {
  id: string;
  displayName: string;
  billingAddress: Record<string, unknown>;
  createdAt: string;
  status: string;
  isDefault?: boolean;
}

/** The company behind the credential. `legal_name` snake_case, `accountType` camelCase. */
export interface BrexCompany {
  id: string;
  legal_name: string;
  mailing_address: Record<string, unknown>;
  accountType: string;
}

interface BrexErrorBody {
  type?: string;
  message?: string;
  code?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `load_custom_fields=false` is meaningful and a spend
 * limit of `0` is a real ceiling, so silently dropping either would make it
 * impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Serialize a Brex query string.
 *
 * The one place a query is built, shared by the actions (through
 * {@link BrexClient}) and by the credential probe, so the two can never address
 * a different resource.
 *
 * Two deliberate details:
 *
 *  - **Parameter names are not percent-encoded.** Brex's multi-value filters are
 *    literally named `email[]`, `status[]`, `manager_id[]` and so on — the
 *    brackets are part of the name, and Brex's own example is
 *    `?status[]=ACTIVE,INVITED`. `URLSearchParams` would send `status%5B%5D=`,
 *    which is legal but is not what the docs, the dashboard's request log or a
 *    person reading a log line will recognize. Brackets are legal in a query
 *    (RFC 3986 `sub-delims`), and every name here is one of our own literals,
 *    so leaving them raw is safe; VALUES are encoded normally.
 *  - **A list becomes one comma-separated value.** Brex documents that
 *    `?status[]=ACTIVE,INVITED` and `?status[]=ACTIVE&status[]=INVITED` are
 *    equivalent, and states values within one filter are OR-ed, so one
 *    parameter is the honest encoding of one filter.
 */
export function queryString(query: Record<string, QueryValue> = {}): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    const flat = Array.isArray(value) ? value.join(",") : String(value);
    parts.push(`${key}=${encodeURIComponent(flat)}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
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

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/**
 * Split a comma-separated multi-value filter.
 *
 * Brex's array filters accept "either a comma-separated list or a repeated
 * parameter"; a `string` param plus this is the form that works in every host,
 * since a repeated query parameter cannot be expressed in a single form field.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Path-escape a caller-supplied resource id.
 *
 * Brex ids are opaque strings; this keeps a pasted `/`, `?` or space from
 * turning into a different request.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Render Brex's error body into one readable sentence.
 *
 * `type` is the machine class (`UNAUTHORIZED`, `NOT_FOUND`, `FORBIDDEN`), `code`
 * the specific one (`USER_NOT_FOUND`), and both are kept verbatim: Brex's own
 * error table shows the same status meaning different things, so the code is
 * what a reader needs.
 */
export function formatBrexError(
  status: number,
  method: string,
  path: string,
  detail: string,
): string {
  const body = parseErrorBody(detail);
  const parts = [
    `Brex ${status}${body?.type ? ` ${body.type}` : ""} for ${method} ${path}`,
    body?.code ? `code ${body.code}` : undefined,
    body?.message ??
      (detail ? truncate(detail, 300) : "no error body, and no message to report"),
    status === 429
      ? "Brex rate-limits to 1,000 requests per 60 seconds per Client ID and account; retry with exponential backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * Parse an error body without throwing on a body that is not JSON.
 *
 * A `401` with no credential at all carries an EMPTY body (measured
 * 2026-09-22), which is why this returns `undefined` rather than a shape.
 */
export function parseErrorBody(detail: string): BrexErrorBody | undefined {
  if (!detail) return undefined;
  try {
    const parsed = JSON.parse(detail) as BrexErrorBody;
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export class BrexClient {
  constructor(private ctx: HookContext) {}

  /** A single entity, or any response that is not a list envelope. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return await readJson<T>(await this.send(path, options));
  }

  /**
   * A list response, normalized to always carry `items`, `next_cursor` and
   * `count`.
   *
   * `items` is coerced to an array and `next_cursor` to `null` when Brex omits
   * it: a workflow that paged on `undefined` would loop forever, and the guide
   * says the field is `nil` at the end rather than that it is absent.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ListPage<T>> {
    const body = await this.json<{ items?: T[]; next_cursor?: string | null }>(path, options);
    const items = Array.isArray(body?.items) ? body.items : [];
    return { items, next_cursor: body?.next_cursor ?? null, count: items.length };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = `${API_BASE}${API_PREFIX}${path}${queryString(options.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    if (options.idempotencyKey) headers[IDEMPOTENCY_HEADER] = options.idempotencyKey;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatBrexError(res.status, init.method ?? "GET", `${API_PREFIX}${path}`, detail),
      );
    }
    return res;
  }
}
