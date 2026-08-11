import type { HookContext } from "@w6w/types";

/**
 * Aircall Public API client.
 *
 * Everything in this module was verified on 2026-08-11 against Aircall's own
 * API reference (`developer.aircall.io/api-references/`, which 301s to
 * `developers.aircall.io/api-references`, 875,367 bytes) plus live probes
 * against `api.aircall.io`. Nothing came from a third-party integration
 * directory.
 *
 * ## One host, version in the path
 *
 * The reference declares exactly one origin, `https://api.aircall.io`, and the
 * "Versioning Strategy" section states the version is a **path segment**, not a
 * header: "Version 1 endpoints: `/v1/users`, `/v1/calls`, etc. Version 2
 * endpoints: `/v2/users`, etc." So the origin is {@link API_BASE} and every
 * call site names its own version prefix — because this app genuinely spans
 * both (see {@link V2} below).
 *
 * ## v1 and v2 are NOT alternatives — they interleave
 *
 * "As of now, v2 of user APIs and webhook events is available", and every v1
 * User page carries the banner *"User V1 API will be deprecated soon. Please
 * migrate to User V2 API."* But v2 exists **only** for Users, and the v2 User
 * surface is strictly smaller than v1's: there is no `/v2/users/availabilities`,
 * no `/v2/users/:id/availability`, no `/v2/users/:id/calls`, no
 * `/v2/users/:id/dial`, no `/v2/users/:id` DELETE. The v2 User object also drops
 * the `numbers` array that v1 embeds, which is why `/v2/users/:id/numbers`
 * exists at all.
 *
 * So this app reads users through **v2** (list, retrieve, numbers) and reaches
 * for **v1** only where v2 has no equivalent (availability, click-to-call,
 * click-to-dial). Everything else — calls, contacts, teams, tags, numbers,
 * webhooks, company — is v1 only, and carries no deprecation notice.
 *
 * ## The error body has TWO shapes, and the one you hit depends on how far in
 * you got
 *
 * Aircall documents its errors as `{"error": "…", "troubleshoot": "…"}`, and
 * that is what the Rails application returns. But `api.aircall.io` sits behind
 * AWS API Gateway + CloudFront, and requests rejected **at the edge** never
 * reach the application — they answer `{"message": "…"}` instead. Measured on
 * 2026-08-11:
 *
 *   | Request                              | Status | Body                          |
 *   | ------------------------------------ | ------ | ----------------------------- |
 *   | `GET /v1/ping` no credential         | 401    | `{"message":"Unauthorized"}`  |
 *   | `GET /v1/ping` bogus Basic pair      | 403    | `{"message":"Forbidden"}`     |
 *   | `GET /v1/definitely-not-real-zzz`    | 404    | `{"message":"Not Found"}`     |
 *
 * {@link formatAircallError} reads both shapes, because a formatter that only
 * knows the documented one renders every authentication failure — the most
 * common failure there is — as an empty string.
 *
 * ## 403 means "your credential is wrong", not "you lack permission"
 *
 * This inverts the usual reading and it is the single most expensive thing to
 * get wrong here. Aircall's own status table for nearly every endpoint says
 * **"403 — Forbidden. Invalid API key or Bearer access token"**, the global
 * error table glosses 403 as "Lack of valid authentication credentials for the
 * target resource", and **401 does not appear in the documented table at all**
 * (it comes from the edge, for a request carrying no `Authorization` header).
 * There is no scope system to be short of: OAuth has exactly one scope,
 * `public_api`, and a Basic API key is company-wide. So a 403 here is never
 * "the credential is fine but narrow" — it is "the credential is not valid".
 * See `auth/basic.ts`.
 *
 * ## Pagination
 *
 * Every list endpoint answers `{"meta": {...}, "<resource>": [...]}`. `meta`
 * carries `count`, `total`, `current_page`, `per_page`, `next_page_link` and
 * `previous_page_link`. Query params are `page` (default 1) and `per_page`
 * (default 20, **minimum 1, maximum 50**). Calls and Contacts are additionally
 * capped at 10,000 items *through pagination* — past that the vendor's own
 * advice is to narrow with `from`.
 *
 * ## Rate limiting
 *
 * 120 requests/minute **per company**, not per key. Headers `X-AircallApi-Limit`,
 * `X-AircallApi-Remaining` and `X-AircallApi-Reset` are documented as being
 * present "when the rate limit has been reached" — see `health/quota.ts` for
 * what that qualifier costs a headroom probe.
 */

/** The one and only API origin. The reference declares no other server. */
export const API_BASE = "https://api.aircall.io";

/** Path prefix for the v1 surface — everything except the User read endpoints. */
export const V1 = "/v1";

/** Path prefix for the v2 surface. Users only; see the module comment. */
export const V2 = "/v2";

export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /**
   * Serialized as JSON. Aircall's "Content-Type" section is explicit: "Every
   * POST, PUT and DELETE HTTP request sent to Aircall Public API must specify
   * the Content-Type entity header to application/json."
   */
  body?: unknown;
  /** Defaults to {@link V1}. */
  prefix?: string;
}

/** The `meta` object every list endpoint returns. */
export interface AircallMeta {
  count?: number;
  total?: number;
  current_page?: number;
  per_page?: number;
  next_page_link?: string | null;
  previous_page_link?: string | null;
}

/** `{"meta": …, "<key>": […]}` — the shape of every list response. */
export type AircallListResponse<T> = { meta?: AircallMeta } & Record<string, T[] | AircallMeta>;

/** The documented application-tier error body. */
export interface AircallErrorBody {
  error?: string;
  troubleshoot?: string;
  /** The edge-tier body. Not documented; measured. See the module comment. */
  message?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `active=false` on a webhook update and
 * `wrap_up_time=0` on a user are both meaningful, and dropping them silently
 * would make them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render a boolean query parameter.
 *
 * Aircall documents every one of these (`fetch_contact`, `fetch_short_urls`,
 * `fetch_call_timeline`, `fetch_aiva_conv`) as "When set to true, …" and says
 * nothing about how a false value is parsed, so a `false` is expressed as
 * absence — which is the documented default for all of them.
 */
export function flag(v: boolean | undefined): string | undefined {
  return v === true ? "true" : undefined;
}

/** Normalise a `multiselect` / comma-string param into a list. */
export function toList(
  v: Array<string | number> | string | undefined | null,
): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Same, for id lists that must reach the wire as numbers. */
export function toIdList(
  v: Array<string | number> | string | undefined | null,
): number[] | undefined {
  const items = toList(v);
  if (!items) return undefined;
  const ids = items.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  return ids.length ? ids : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Aircall addresses a User by numeric id **or by email address** —
 * `GET /v1/users/john.doe@aircall.io` is documented verbatim, twice — and a
 * Webhook by UUID. So `.`, `-` and `@` all have to survive, while a `/` or `?`
 * someone pastes into an id field must not.
 *
 * `encodeURIComponent` alone is *not* the right tool here, which is easy to miss:
 * it leaves `.` and `-` alone but percent-encodes `@` to `%40`, turning the
 * vendor's own documented URL into `/v2/users/john.doe%40aircall.io`. Whether
 * Aircall's router decodes that back before matching is not something this app
 * can verify without a live account, and the answer does not need to be
 * guessed: `@` is an unreserved-in-practice `pchar` under RFC 3986 §3.3
 * (`pchar = unreserved / pct-encoded / sub-delims / ":" / "@"`), so it is legal
 * raw in a path segment. Restoring it reproduces the documented request
 * byte-for-byte and leaves every dangerous character escaped.
 */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim()).replace(/%40/g, "@");
}

/**
 * The response field that carries a live shared secret, deleted before a
 * Webhook read returns.
 *
 * `GET /v1/webhooks` and `GET /v1/webhooks/:id` return each webhook's `token`
 * in plaintext. That token is not an identifier: the reference says "Use the
 * `token` field to identify from which Aircall account a Webhook is sent from"
 * and the attribute table calls it the "Unique token for request's
 * authentication" — it is the shared secret a receiver checks to decide whether
 * an inbound delivery really came from Aircall. Anyone holding it can forge
 * deliveries into that receiver.
 *
 * A workflow step's result is persisted in the run record and routinely echoed
 * into logs, other apps and human-readable previews, so a bulk read of 100
 * webhooks would turn one list call into a durable, multi-secret leak. Aircall
 * publishes no projection that omits it, so this app strips it client-side on
 * every read.
 *
 * **`webhook-create` is the deliberate exception.** There the token is being
 * *issued*, it belongs to the webhook this very step created, and the receiver
 * cannot verify a single delivery without it — the same reading the pack
 * already applies to Fathom's `whsec_…`. If a token is lost, delete the webhook
 * and create a new one; there is no rotate endpoint.
 */
export const WEBHOOK_SECRET_FIELD = "token";

/**
 * Remove {@link WEBHOOK_SECRET_FIELD} from a webhook entity, returning a
 * shallow copy.
 *
 * Deliberately narrow: it deletes one named key off one entity shape rather
 * than scrubbing anything that *looks* secret, because a heuristic that ate a
 * field called `token` anywhere would corrupt a Contact's `information` payload
 * or a Call's tags — user data this app exists to move.
 */
export function stripWebhookToken<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out[WEBHOOK_SECRET_FIELD];
  return out as T;
}

/** {@link stripWebhookToken} over a list. */
export function stripWebhookTokens<T>(entities: T[]): T[] {
  return entities.map(stripWebhookToken);
}

/**
 * Turn an Aircall error body into one actionable line.
 *
 * Handles both documented and measured shapes (see the module comment), and
 * translates the status codes whose Aircall meaning differs from the usual one:
 *
 *  - **403** is a rejected credential, not a missing permission. Rendering it as
 *    "forbidden" sends the reader looking for a scope that does not exist.
 *  - **405** is used as a *state* error on several endpoints — "User not
 *    available" for click-to-call, "Recording is disabled on the Call's number"
 *    for pause/resume — not as "wrong HTTP verb".
 *
 * The message can carry only Aircall's own prose and the caller's own input;
 * the credential never enters this module.
 */
export function formatAircallError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: AircallErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as AircallErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const vendor = [parsed?.error, parsed?.troubleshoot, parsed?.message]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join(": ");

  const hint = status === 401
    ? "no Authorization header reached Aircall — reconnect this connection"
    : status === 403
    ? "Aircall returns 403 for an INVALID api_id/api_token pair, not for a missing permission — " +
      "check the credential"
    : status === 405
    ? "Aircall uses 405 as a state error here (user unavailable, or recording disabled on the " +
      "number), not as a wrong-verb error"
    : status === 429
    ? "Aircall allows 120 requests/minute per company — retry after the X-AircallApi-Reset window"
    : undefined;

  const parts = [
    `Aircall ${status} for ${method} ${path}`,
    vendor || (raw ? truncate(raw) : undefined),
    hint,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class AircallClient {
  constructor(private ctx: HookContext) {}

  /**
   * Parse a JSON body.
   *
   * Aircall answers 204 with no body for several endpoints (transfer, dial,
   * click-to-call, pause/resume recording, delete contact/tag/webhook), so an
   * empty body is `undefined` rather than a parse error.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A single-entity read: `{"call": {...}}` in, the entity out.
   *
   * Aircall wraps every single-entity response in a key named after the
   * resource, and unwrapping it here keeps that vendor detail out of 20 action
   * files.
   */
  async entity<T = unknown>(
    path: string,
    key: string,
    options: RequestOptions = {},
  ): Promise<T | undefined> {
    const body = await this.json<Record<string, unknown>>(path, options);
    if (!body || typeof body !== "object") return undefined;
    return (key in body ? body[key] : body) as T;
  }

  /** A list read: `{"meta": …, "calls": […]}` in, `{ meta, items }` out. */
  async list<T = unknown>(
    path: string,
    key: string,
    options: RequestOptions = {},
  ): Promise<{ meta: AircallMeta; items: T[] }> {
    const body = await this.json<Record<string, unknown>>(path, options);
    const items = body && Array.isArray(body[key]) ? body[key] as T[] : [];
    const meta = (body?.meta ?? {}) as AircallMeta;
    return { meta, items };
  }

  /** Status only, for the endpoints that answer 204 with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  /** The raw response, for the one check that needs response headers. */
  async head(path: string, options: RequestOptions = {}): Promise<Response> {
    return await this.send(path, options);
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${options.prefix ?? V1}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        // Aircall's only array query param is `tags[]` on Search Calls, and it
        // is a REPEATED key rather than a comma-joined value — the reference
        // documents it as "Array of Tags IDs" with an AND semantic between
        // them. Comma-joining silently matches nothing.
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
        continue;
      }
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
        formatAircallError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
