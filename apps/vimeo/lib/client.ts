import type { HookContext } from "@w6w/types";

/**
 * Vimeo API client.
 *
 * Every path, verb, parameter, body field and enum used anywhere in this app was
 * read on 2026-08-11 from Vimeo's own developer site — the per-resource OpenAPI
 * documents that `developer.vimeo.com/api/reference/<group>` embeds (the pages
 * ship the spec inline as a `var devsite = {…}` blob, so it is the vendor's
 * machine-readable source, not scraped prose), plus the guides
 * `/api/authentication`, `/api/common-formats`, `/api/upload/videos` and
 * `/guidelines/rate-limiting`. Nothing here came from a third-party integration
 * directory or from a sibling app in this pack.
 *
 * ## The version lives in `Accept`, not in the path
 *
 * `api.vimeo.com` has no `/v3/` prefix. The API is versioned entirely through
 * the `Accept` header:
 *
 *     Accept: application/vnd.vimeo.*+json;version=3.4
 *
 * The reference reports `apiVersions: ["3.0","3.1","3.2","3.3","3.4"]` and
 * `version: "3.4.9"`, and `/api/common-formats#using-the-accept-header` says to
 * set the header explicitly on every request. Omitting it does not fail — it
 * silently pins you to whatever Vimeo currently treats as default, which is the
 * whole failure mode the header exists to prevent. So {@link ACCEPT} is sent on
 * every call, including the auth probe and the quota probe.
 *
 * The `*` is a wildcard for the resource type. A concrete type
 * (`application/vnd.vimeo.video+json`) is also legal but must match the
 * endpoint exactly or the API errors, so the wildcard is what this client uses.
 *
 * ## `fields` is not an optimisation, it is the rate limit
 *
 * `/guidelines/rate-limiting` states that Vimeo **doubles** the per-minute
 * request quota for any request that uses the `fields` query parameter, and —
 * the part that bites — that `X-RateLimit-Limit` and `X-RateLimit-Remaining`
 * are *already reported as the doubled figure*: "If you aren't using field
 * filtering, divide these values by 2." A caller who reads the header without
 * filtering is over-reading their own headroom by 100%.
 *
 * `fields` is therefore a first-class param on every read here, and the
 * credential and quota probes both use it. It is documented in
 * `/api/common-formats#json-filter`: a comma-separated list, dot notation for
 * nested paths, supported on every method except `DELETE`, and always a query
 * parameter — never a body field.
 *
 * ## Representations carry cleartext passwords
 *
 * This is the reason `fields` also matters for safety, and it is easy to miss:
 *
 *  - `video.password` — "The privacy-enabled password to watch the video …
 *    requires a bearer token with the `private` scope". It is a **top-level,
 *    default-returned** field of the video representation.
 *  - `album.privacy.password` — the showcase's password, returned whenever the
 *    showcase's privacy is `password`.
 *  - `user.preferences.videos.password` and
 *    `user.preferences.videos.privacy.password` — the account's default video
 *    password, in the `/me` representation.
 *
 * None of these is *this connection's* credential, so no sandbox rule is
 * broken by returning them — they are the user's own data, flowing through the
 * user's own workflow. But they are secrets, and a full-fat `GET /me` or
 * `GET /videos/{id}` puts them into whatever a workflow does next. Two
 * consequences, both deliberate:
 *
 *  1. The auth probe and the quota probe request `fields=uri,name` and
 *     `fields=uri` respectively, so they cannot echo a password even in a
 *     debug log. See `auth/access-token.ts`.
 *  2. Every read action exposes `fields`, and its hint says why.
 *
 * Nothing is stripped from a response here. Silently deleting a field the
 * vendor returned would be a worse surprise than the one being avoided, and
 * `fields` is the vendor's own supported way to not ask for it.
 *
 * ## Collections
 *
 * Every list endpoint returns the same envelope, documented in
 * `/api/common-formats#representations`:
 *
 *     { total, page, per_page, paging: { next, previous, first, last }, data: [ … ] }
 *
 * `per_page` defaults to 25 and maxes at 100. `paging.*` are relative URIs or
 * `null`. Vimeo pages by `page`/`per_page` number, not by cursor, and asking
 * for a page that does not exist is a 404 rather than an empty list.
 */

export const API_BASE = "https://api.vimeo.com";
export const API_HOST = "api.vimeo.com";

/** The current API version, from the reference's own `apiVersions` list (3.4.9 → 3.4). */
export const API_VERSION = "3.4";

/** The versioned `Accept` header, exactly as `/api/common-formats` publishes it. */
export const ACCEPT = `application/vnd.vimeo.*+json;version=${API_VERSION}`;

/**
 * A self-identifying User-Agent.
 *
 * `/api/common-formats#using-the-user-agent-header` asks for one by name and
 * says outright: "If we see a generic `User-Agent` header, we might block your
 * app's access to the API." It is sent on every request for that reason, and
 * carries no account, tenant or credential information — just the app.
 */
export const USER_AGENT = "w6w-vimeo-app/0.1.0";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Vimeo's collection envelope. See the module docs. */
export interface VimeoCollection<T = unknown> {
  total?: number;
  page?: number;
  per_page?: number;
  paging?: {
    next?: string | null;
    previous?: string | null;
    first?: string | null;
    last?: string | null;
  };
  data?: T[];
}

/**
 * Vimeo's error body, from the `Error` response schema on
 * `developer.vimeo.com/api/reference/response/error` and confirmed byte-for-byte
 * against a live unauthenticated `GET https://api.vimeo.com/` on 2026-08-11,
 * which answered `401` with `content-type: application/vnd.vimeo.error+json`
 * and exactly these four keys.
 */
export interface VimeoError {
  error?: string;
  developer_message?: string;
  error_code?: number;
  link?: string | null;
}

/** Keep a message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Drop keys the caller left unset.
 *
 * Vimeo's edit endpoints are `PATCH` and apply exactly the keys present in the
 * body, so forwarding a key the user never filled in would blank a real value.
 * `false` and `0` survive: `privacy.download: false` and `duration: 0` are both
 * meaningful and must stay expressible.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Build a nested object from dot-separated keys, dropping unset leaves.
 *
 * The reference renders body parameters in **dot notation** — `privacy.view`,
 * `embed.color`, `upload.approach` — but the wire format is nested JSON, as
 * every worked example in `/api/upload/videos` shows:
 * `{"upload":{"approach":"pull","link":"…"},"name":"…","privacy":{"view":"anybody"}}`.
 * Posting the literal key `"privacy.view"` is not the same request. This helper
 * is the one place that translation happens, so no action has to get it right
 * on its own.
 *
 * An object with no surviving leaves is omitted entirely rather than sent as
 * `{}` — a bare `"privacy": {}` is a body field the user did not ask for.
 */
export function nest(entries: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(entries)) {
    if (value === undefined || value === null || value === "") continue;
    const parts = path.split(".");
    let node = out;
    for (const part of parts.slice(0, -1)) {
      const existing = node[part];
      if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
        node[part] = {};
      }
      node = node[part] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

/**
 * Normalise a list-ish param into one comma-separated string.
 *
 * Every multi-valued parameter in this API is comma-separated in a single
 * value — `fields=uri,name`, `uris=/videos/1,/videos/2`,
 * `filter_tag=abc,xyz`, `clip_privacy_filters=private,unlisted` — never a
 * repeated key. A `multiselect` param normally arrives as an array but the host
 * may pass a lone selection as a bare string, so both shapes land here.
 */
export function toCsv(value: string[] | string | undefined | null): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const items = (Array.isArray(value) ? value : value.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/**
 * The same normalisation as {@link toCsv}, but yielding an array — for the
 * handful of body fields Vimeo types as a JSON array rather than a
 * comma-separated string (`embed_domains`, `content_filter`, `videos.rating`).
 *
 * Returns `undefined` rather than `[]` for empty input. That distinction is the
 * whole point: `embed_domains: []` is a request to *clear* the allowlist, and a
 * param the user simply left blank must never turn into one.
 */
export function toArray(value: string[] | string | undefined | null): string[] | undefined {
  const csv = toCsv(value);
  return csv === undefined ? undefined : csv.split(",");
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host passes a `json` param through in whichever shape it arrived.
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

/**
 * Turn a numeric id or a Vimeo URI into the bare id used in a path.
 *
 * Vimeo hands back `uri: "/videos/258684937"` on every entity and users
 * naturally paste that, while every path parameter is documented as the bare
 * numeric id. Accepting both removes an entire class of "404 no such video"
 * from a workflow that simply forwarded the previous step's `uri`.
 *
 * Showcases make this worse rather than better and it is worth stating: the
 * endpoints live under `/albums/{album_id}` but a showcase's own URI is
 * `/showcases/{id}` (see the `album_uris` parameter of `PATCH /users/{id}/albums`,
 * whose documented example is `/showcases/258684873`). Both forms reduce to the
 * same trailing id here.
 */
export function idFromRef(value: string | number, label: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error(`${label} is required`);
  const tail = raw.replace(/\/+$/, "").split("/").pop() ?? "";
  if (!tail) throw new Error(`${label} is not a usable id: ${truncate(raw, 80)}`);
  return encodeURIComponent(tail);
}

/**
 * Turn an id or URI into a canonical `/videos/{id}` URI.
 *
 * The bulk endpoints (`uris` on folder add/remove, `videos` on showcase
 * replace) take URIs, not ids, and reject bare numbers.
 */
export function videoUri(value: string | number): string {
  return `/videos/${idFromRef(value, "Video ID")}`;
}

/** Rate-limit headroom read off a response. See `health/quota.ts`. */
export interface RateLimitReading {
  limit?: number;
  remaining?: number;
  /** ISO 8601, normalised from Vimeo's datetime header. */
  resetAt?: string;
}

/**
 * Read Vimeo's three rate-limit headers.
 *
 * `/guidelines/rate-limiting` documents exactly `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining` and `X-RateLimit-Reset` ("a datetime value indicating
 * when the next 60-second period begins"), and a 429 with error code 9000 once
 * the allowance is gone.
 *
 * Returns `{}` when the headers are absent, which is a real case rather than a
 * defensive flourish: a live unauthenticated request to `api.vimeo.com` on
 * 2026-08-11 came back with none of the three, consistent with the vendor's
 * rule that the quota belongs to the *end user the token identifies*. Callers
 * must report `unknown` on `{}` and never invent a number.
 */
export function readRateLimit(headers: Headers): RateLimitReading {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const rawReset = headers.get("x-ratelimit-reset");
  let resetAt: string | undefined;
  if (rawReset) {
    const parsed = new Date(rawReset);
    if (!Number.isNaN(parsed.getTime())) resetAt = parsed.toISOString();
  }
  const reading: RateLimitReading = {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    resetAt,
  };
  if (reading.limit === undefined && reading.remaining === undefined && !reading.resetAt) return {};
  return reading;
}

/**
 * Turn Vimeo's error body into one actionable line.
 *
 * The vendor ships two messages on purpose — `error` for end users and
 * `developer_message` for us — plus a numeric `error_code` that its own
 * reference indexes failures by (8003 "the app didn't receive the user's
 * credentials", 2204 "invalid body parameter", 5000 "no such resource", 9000
 * "rate limited"). All three are surfaced, because a bare "HTTP 400" throws
 * away the only part that says what to change.
 *
 * Nothing here can carry credential material: the credential never enters this
 * module, and the echoed text is the vendor's own.
 */
export function formatVimeoError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: VimeoError | null = null;
  try {
    parsed = JSON.parse(raw) as VimeoError;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.error && !parsed.developer_message && !parsed.error_code)) {
    return `Vimeo ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const parts = [
    `Vimeo ${status}${parsed.error_code ? ` (error_code ${parsed.error_code})` : ""} for ` +
    `${method} ${path}`,
    parsed.developer_message,
    parsed.developer_message ? undefined : parsed.error,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class VimeoClient {
  constructor(private ctx: HookContext) {}

  /** JSON in, parsed JSON out. `204` and empty bodies yield `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A list request, typed as Vimeo's collection envelope.
   *
   * Returned whole rather than unwrapped to `data`: `paging.next` and `total`
   * are the only supported way to walk a large result set, and a step that
   * returns one page plus its paging block is composable where one that
   * silently fetches everything is a way to trip the per-minute limit.
   */
  collection<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<VimeoCollection<T>> {
    return this.request<VimeoCollection<T>>(path, options);
  }

  /**
   * A request whose response headers matter (the quota probe). Returns the raw
   * `Response`; the caller owns the body.
   */
  send(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.dispatch(path, options);
  }

  private async dispatch(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      // Multi-valued parameters are ONE comma-separated value on this API, never
      // a repeated key — see `toCsv`.
      url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }

    // No Authorization header here. The runtime routes this request through the
    // Auth `sign` hook, which is the only code that ever holds the token.
    const headers: Record<string, string> = {
      accept: ACCEPT,
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatVimeoError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
