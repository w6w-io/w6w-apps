import type { HookContext } from "@w6w/types";

/**
 * Givebutter API v1 REST client.
 *
 * Verified 2026-09-05 against Givebutter's own machine-readable OpenAPI 3.1
 * document (`https://givebutter.com/docs/api.json`, 536,523 bytes,
 * `info.title` "Givebutter API Documentation") — reached via the `openapi`
 * link on `docs.givebutter.com`'s `llms.txt` index, not the Mintlify-bundled
 * decoy that lives at `/api-reference/openapi.json` on the docs host itself
 * (that path 404s here; the real spec is served from `givebutter.com`, not
 * `docs.givebutter.com`) — plus live probes against `api.givebutter.com`.
 *
 * ## One host, one prefix, one envelope
 *
 * The OpenAPI document declares exactly one server, `https://api.givebutter.com`,
 * and every documented path carries the `/v1` prefix (the two `/sso/v1/*`
 * paths are the one exception — see "SSO endpoints are not reachable" below).
 * A single resource read answers `{"data": {...}}`; a list answers
 * `{"data": [...], "links": {...}, "meta": {...}}` (page-number pagination —
 * see {@link PageEnvelope}). Both are unwrapped by {@link GivebutterClient.data}.
 *
 * ## The error envelope the docs show is not the one on the wire
 *
 * Every response schema in the OpenAPI document — `AuthenticationException`,
 * `AuthorizationException`, `ModelNotFoundException`, `NotFoundHttpException`
 * — and the `/api-reference/errors` and `/api-reference/authentication` docs
 * pages all show a flat `{"message": "..."}` body. A live unauthenticated
 * request instead answers:
 *
 *     $ curl https://api.givebutter.com/v1/campaigns
 *     {"error":{"message":"Unauthorized"}}
 *
 * — the same shape on a garbage bearer token, a missing header, and a
 * malformed scheme. {@link formatGivebutterError} reads `error.message` first
 * and falls back to a bare `message`, so it copes with either shape; the
 * `errors` (per-field validation) object documented on a 422 was not
 * independently confirmed live (it requires a real API key to trigger), so
 * that fallback path is speculative rather than measured. The docs are not
 * even internally consistent about it: `DELETE /v1/campaigns/{campaign}`'s
 * own 409 response schema documents `{"error": {"message": "..."}}` — the
 * shape actually observed everywhere — while every *other* documented error
 * response on the same host uses the flat shape.
 *
 * ## A nonexistent resource id doesn't get a JSON 404 — it gets the marketing site
 *
 * This is easy to misdiagnose as "IDs must be numeric", and that is NOT what is
 * happening — it was checked carefully, unauthenticated, across every resource
 * this app covers:
 *
 *     $ curl https://api.givebutter.com/v1/campaigns/does-not-exist   # -> 404 text/html
 *     $ curl https://api.givebutter.com/v1/campaigns/999999999999     # -> 404 text/html (numeric!)
 *     $ curl https://api.givebutter.com/v1/campaigns/12345            # -> 401 application/json
 *     $ curl https://api.givebutter.com/v1/campaigns/1                # -> 401 application/json
 *
 * A syntactically-plausible but non-existent numeric id (`999999999999`) gets
 * the identical branded Webflow 404 page a garbage slug gets — while a small,
 * *real* id reaches the JSON-answering API and correctly reports 401 for a
 * missing credential. Bisecting confirmed the boundary sits somewhere between
 * campaign ids 100,000 and 200,000: below it, id after id answers 401; above
 * it, every id answers the marketing 404 — consistent with route-model
 * binding resolving the row (against the whole system, not just the caller's
 * own org — no credential was on the wire yet) *before* the auth middleware
 * runs, so a not-found id never reaches the code path that would emit a JSON
 * error at all. The same shape held for `/v1/contacts`, `/v1/pledges` and
 * `/v1/messages` (the other resources whose ids are low enough to have real
 * rows near the low end of the integer space); the rest of this app's
 * resources (funds, households, webhooks, payouts, plans, tickets,
 * transactions) were only ever observed on the 404 branch, since no id near
 * zero was known to exist for them.
 *
 * The practical upshot: **there is no way to distinguish "wrong id" from
 * "right id, no permission" purely from the wire**, and a caller cannot fix
 * this by getting the id's *format* right — an id param here is validated for
 * shape (numeric where the vendor documents `type: integer`) but a
 * well-formed, merely nonexistent id still returns unparseable HTML rather
 * than a recognizable API error. `formatGivebutterError` falls back to
 * quoting the raw (truncated) body specifically to surface this rather than
 * hide an empty/garbled `message`.
 *
 * ## SSO endpoints are not reachable with an API key
 *
 * The OpenAPI document lists `GET /sso/v1/account` and
 * `GET /sso/v1/campaigns/{campaign}` alongside every other endpoint, with the
 * same `security: [{http: []}]` (bearer) requirement. Live, a bearer token
 * gets neither a 200 nor a 401 — it gets an HTTP 302 redirect to
 * `https://api.givebutter.com/login`, regardless of whether the token is
 * valid. These two endpoints belong to Givebutter's session-based SSO widget
 * flow, not the API-key surface documented one line above them, so this app
 * declares no actions against them.
 *
 * ## Rate limits: trust the header, not the docs page
 *
 * `docs.givebutter.com/api-reference/rate-limits` states "500 requests per
 * minute". Every response measured live on 2026-09-05 — authenticated and
 * not — carried `x-ratelimit-limit: 200` with no `x-ratelimit-reset` header.
 * `health/quota.ts` reports the header's own number, not the documented one.
 */

/** The one and only documented API origin. */
export const API_BASE = "https://api.givebutter.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The `links`/`meta` page-number pagination envelope every list endpoint uses. */
export interface PageEnvelope<T> {
  data: T[];
  links: { first: string; last: string; prev: string | null; next: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

interface GivebutterErrorBody {
  error?: { message?: string };
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Drop keys the caller left unset, so an unset filter/field is omitted rather
 * than sent empty. Generic so a query-shaped call site (values narrowed to
 * `QueryValue`) type-checks against `RequestOptions.query` without a cast.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/** Normalise a `multiselect`-shaped param (or a comma-separated string) into a string array. */
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

/** Keep an error message readable — a validation body can carry many field errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Givebutter's error body into one actionable line.
 *
 * Reads `error.message` first — the shape actually observed on the wire — and
 * falls back to a bare `message` — the shape every docs page and OpenAPI
 * response schema documents — so this keeps working if Givebutter ever makes
 * the two shapes agree. `errors` (422 field-level validation) is appended
 * verbatim when present, under either envelope.
 */
export function formatGivebutterError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: GivebutterErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as GivebutterErrorBody;
  } catch { /* not JSON — most commonly the marketing site's HTML 404 template */ }

  const message = parsed?.error?.message ?? parsed?.message;
  if (!message) {
    return `Givebutter ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
  }

  const parts = [
    `Givebutter ${status} for ${method} ${path}`,
    message,
    parsed?.errors
      ? Object.entries(parsed.errors).map(([field, msgs]) => `${field}: ${msgs.join(", ")}`).join(
        "; ",
      )
      : undefined,
    status === 429 ? "rate limited — see the x-ratelimit-* response headers" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1200);
}

export class GivebutterClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": ...}` in, `data` out — a single resource. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /** The full `{data, links, meta}` page envelope, for a list endpoint. */
  async page<T = unknown>(path: string, options: RequestOptions = {}): Promise<PageEnvelope<T>> {
    return await this.json<PageEnvelope<T>>(path, options);
  }

  /** Parse the body without unwrapping any envelope. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer with no meaningful body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
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
        formatGivebutterError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
