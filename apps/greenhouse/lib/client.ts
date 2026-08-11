import type { HookContext } from "@w6w/types";

/**
 * Greenhouse **Harvest v3** REST client.
 *
 * Everything in this module was verified on 2026-08-11 against Greenhouse's own
 * machine-readable OpenAPI 3.1 document for Harvest v3 (`harvest-api.json`,
 * `info.version` `v3`, 134 paths / 185 operations, served inside every page of
 * `harvestdocs.greenhouse.io`), against the prose guides on that same site
 * (Authentication, Pagination, List endpoints, Rate Limiting), and against live
 * unauthenticated probes of `harvest.greenhouse.io` and `auth.greenhouse.io`.
 * Nothing here came from a third-party integration directory.
 *
 * ## Why v3 and not v1
 *
 * The v1/v2 reference (`developers.greenhouse.io/harvest.html`) carries a banner
 * on every page:
 *
 *   > "The Harvest v1/v2 API is deprecated and will be removed on August 31,
 *   > 2026. Please migrate to Harvest v3."
 *
 * v1 is HTTP Basic with the API key as the username and an empty password, and
 * it still answers today — but an App built on it stops working on a known date.
 * v3 is the surface Greenhouse is keeping, so this app calls `/v3` exclusively.
 * The v1 API key is still a supported way to *connect*: `auth/api-key.ts`
 * exchanges it for a v3 bearer token through Greenhouse's own documented
 * transition endpoint. See that file for what happens to it at the sunset.
 *
 * ## One host, one prefix
 *
 * The OpenAPI document declares exactly one server, `https://harvest.greenhouse.io`,
 * and every resource path carries the `/v3` prefix. Token minting is split
 * across two hosts and that split is load-bearing:
 *
 *  - `https://auth.greenhouse.io/token` — the OAuth 2.0 endpoint (client
 *    credentials for customer-built integrations, authorization code for
 *    partners). The durable path.
 *  - `https://harvest.greenhouse.io/auth/token` — the transition endpoint that
 *    turns a v1/v2 Harvest API key into a v3 bearer token. Greenhouse's own
 *    OpenAPI description of it says: "This endpoint is only accessible with
 *    Harvest API keys (non-OAuth) to support migrations into Harvest v3. We will
 *    deprecate this endpoint when Harvest v1/v2 is deprecated."
 *
 * One doc page (`docs/list-endpoints`) shows a worked example against
 * `https://api.greenhouse.io/v3/applications`. That host is not the API: it
 * answers `302` to a browser login for both `/v1/...` and `/v3/...` (measured
 * 2026-08-11). The OpenAPI `servers` entry and every other curl sample in the
 * docs agree on `harvest.greenhouse.io`, so that is the only host this app
 * builds a URL against.
 *
 * ## List responses are a bare array — the page cursor is in a header
 *
 * Every `GET /v3/<collection>` answers a **bare JSON array**. There is no
 * envelope, no `records` key, no `total`, and no page metadata in the body at
 * all. The only way to page is the RFC 5988 `Link` response header:
 *
 *   Link: <https://harvest.greenhouse.io/v3/jobs?cursor=…>; rel="next"
 *
 * v3 returns a `next` link and nothing else — no `prev`, no `last`, so there is
 * no way to learn the total or jump to the end. When the header is absent you
 * are on the last page. {@link HarvestClient.list} returns the items alongside
 * the extracted cursor so an Action can hand it to the next step.
 *
 * ## A cursor must travel ALONE
 *
 * The vendor's pagination guide is explicit: "When you pass a cursor, it must be
 * the only query parameter", and `GET /v3/jobs?cursor=…&per_page=50` is given as
 * an example that **fails** with 422. The cursor encodes the filters of the
 * request that produced it, so re-sending them is not redundant — it is an
 * error. {@link buildListQuery} refuses that combination locally with a message
 * naming the offending parameters, rather than spending a request to be told 422.
 *
 * ## Date filters use a pipe, not an operator suffix
 *
 * `created_at`, `updated_at`, `last_activity_at`, `opened_at`, … are declared in
 * the OpenAPI document as objects with `style: "pipeDelimited"`, which on the
 * wire is `created_at=gte|2024-01-01T00:00:00Z`. It is not `created_at[gte]=`,
 * not `created_at_after=`, and not a bare timestamp. See {@link dateFilter}.
 *
 * ## Errors
 *
 * Failures answer `{"message": …}` and, for validation, an `errors` array whose
 * entries are *either* strings or single-key objects — both shapes appear in the
 * vendor's own examples on one page:
 *
 *   {"message":"Unprocessable Content","errors":["When passing a cursor, do not
 *    include other query params."]}
 *   {"message":"Unprocessable Content","errors":[{"per_page":"`600` number is
 *    greater than: 500"}]}
 *
 * {@link formatHarvestError} flattens both, because a bare "HTTP 422" hides the
 * one sentence that says which parameter to fix.
 *
 * ## Rate limits
 *
 * A fixed 30-second window, with `X-RateLimit-Limit`, `X-RateLimit-Remaining`
 * and `X-RateLimit-Reset` (UTC epoch seconds) on **every** response — including
 * error responses, which is what lets `health/quota.ts` report headroom without
 * needing a scope. A 429 carries `Retry-After` in seconds. Token requests are
 * metered separately on a 60-second window.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://harvest.greenhouse.io";

/** Every Harvest v3 resource path carries this prefix. */
export const API_PREFIX = "/v3";

/** OAuth 2.0 token endpoint — client credentials and authorization code. */
export const AUTH_BASE = "https://auth.greenhouse.io";

/** Vendor default `per_page`, stated so hints and tests do not drift from it. */
export const PER_PAGE_DEFAULT = 100;

/** Vendor maximum `per_page`. Anything larger is a 422, not a clamp. */
export const PER_PAGE_MAX = 500;

/** Vendor cap on `ids` (and `fields`) — "max 50 per request". */
export const IDS_MAX = 50;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with a JSON content type. */
  body?: unknown;
}

/** One page of a v3 list endpoint: the bare array plus the header-borne cursor. */
export interface HarvestPage<T> {
  items: T[];
  /**
   * The `cursor` value pulled out of the `Link: …; rel="next"` URL, or
   * `undefined` on the last page. Opaque — pass it straight back in, never parse
   * or construct one.
   */
  nextCursor?: string;
  /** The full next-page URL as the vendor sent it, for logs and debugging. */
  nextUrl?: string;
  /** Whether another page exists. Equivalent to `nextCursor !== undefined`. */
  hasMore: boolean;
  rateLimit: RateLimit;
}

/** The `X-RateLimit-*` triple, as documented on every response. */
export interface RateLimit {
  limit?: number;
  remaining?: number;
  /** UTC epoch seconds when the current 30-second window resets. */
  resetAt?: number;
  /** Seconds to wait, present only on a 429. */
  retryAfter?: number;
}

interface HarvestErrorBody {
  message?: string;
  errors?: Array<string | Record<string, string>>;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact<T extends Record<string, QueryValue>>(obj: T): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render one of v3's `pipeDelimited` date filters.
 *
 * The OpenAPI document types `created_at` (and its siblings) as an *object* with
 * `gte` / `lte` / `gt` / `lt` members and `style: "pipeDelimited"`; the vendor's
 * own worked example spells that `created_at=gte|2024-01-01T00:00:00Z`. Only one
 * operator is exercised here because only the single-pair form appears anywhere
 * in Greenhouse's documentation — the multi-pair spelling
 * (`gte|…|lte|…`) that OpenAPI's serialization rules imply is never shown and
 * was not testable without a credential, so this app does not emit it and no
 * Action offers a second operator. Two-sided ranges are therefore out of scope
 * rather than guessed at.
 *
 * Returns `undefined` when either half is missing, so a half-filled form is a
 * no-op filter instead of a 422.
 */
export function dateFilter(operator?: string, value?: string): string | undefined {
  const op = (operator ?? "").trim();
  const at = (value ?? "").trim();
  if (!op || !at) return undefined;
  return `${op}|${at}`;
}

/**
 * Normalise a comma-or-array id list into the `explode: false` form v3 expects
 * (`ids=1,2,3`), and enforce the vendor's documented 50-item ceiling locally.
 *
 * The ceiling is checked here rather than left to the server because the failure
 * is a 422 whose message names a limit, and finding out costs a request plus a
 * confusing error in a workflow run.
 */
export function idList(
  value: string | number | Array<string | number> | undefined | null,
  label: string,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parts = (Array.isArray(value) ? value : String(value).split(","))
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  if (parts.length > IDS_MAX) {
    throw new Error(
      `${label} accepts at most ${IDS_MAX} ids per request (Greenhouse's documented limit); ` +
        `${parts.length} were supplied. Split the call, or page with a filter instead.`,
    );
  }
  return parts.join(",");
}

/** Keep an error message readable — a validation body can carry many entries. */
export function truncate(text: string, max = 700): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Build the query string for a list endpoint, enforcing the cursor rule.
 *
 * Greenhouse rejects a cursor sent alongside anything else with a 422 whose
 * message is "When passing a cursor, do not include other query params." That is
 * a fair rule — the cursor already encodes the filters of the request that
 * produced it — but it is invisible from a form where `per_page` and a cursor
 * field sit side by side. Failing locally names the exact parameters to clear.
 */
export function buildListQuery(
  cursor: string | undefined,
  rest: Record<string, QueryValue>,
): Record<string, QueryValue> {
  const others = compact(rest);
  const trimmed = (cursor ?? "").trim();
  if (!trimmed) return others;

  const offending = Object.keys(others);
  if (offending.length > 0) {
    throw new Error(
      "Greenhouse rejects a cursor combined with any other query parameter (HTTP 422). " +
        `Clear ${offending.join(", ")} when paging — the cursor already carries the filters ` +
        "and page size of the request that produced it.",
    );
  }
  return { cursor: trimmed };
}

/**
 * Pull the `rel="next"` URL out of an RFC 5988 `Link` header.
 *
 * Written against the shape v3 actually emits — a single `<url>; rel="next"` —
 * but tolerant of the multi-link form v1 used (`next`, `prev`, `last`) so a
 * future v3 that grows more relations keeps working rather than silently
 * returning the wrong link.
 */
export function parseNextLink(header: string | null): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(/,\s*(?=<)/)) {
    const match = /<([^>]+)>\s*;\s*(.*)$/.exec(part.trim());
    if (!match) continue;
    if (/rel\s*=\s*"?next"?/i.test(match[2])) return match[1].trim();
  }
  return undefined;
}

/**
 * Extract the opaque `cursor` parameter from a next-page URL.
 *
 * The vendor's instruction is to follow the `Link` URL verbatim. An Action
 * cannot hand a whole URL to the next workflow step and have it re-signed
 * safely, so the cursor is lifted out and re-sent as the sole query parameter —
 * which reconstructs byte-identical request the header pointed at, because a
 * cursor request may carry no other parameter anyway.
 */
export function cursorFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).searchParams.get("cursor") ?? undefined;
  } catch {
    return undefined;
  }
}

/** Read the documented rate-limit triple off any response, error ones included. */
export function readRateLimit(headers: Headers): RateLimit {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const out: RateLimit = {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    resetAt: num("x-ratelimit-reset"),
    retryAfter: num("retry-after"),
  };
  return out;
}

/**
 * Turn a Harvest error body into one actionable line.
 *
 * Three body shapes reach this function and all three are the vendor's:
 *
 *  - `{"message": "Unauthorized", "errors": ["Token could not be decoded…"]}`
 *    — v3's auth rejection, observed live 2026-08-11.
 *  - `{"message": "Unprocessable Content", "errors": [{"per_page": "…"}]}`
 *    — validation, with the offending field as the object key.
 *  - `{"message": "Resource not found"}` — no `errors` at all.
 *
 * The 429 hint is appended from the header rather than the body because the body
 * of a 429 says nothing about how long to wait.
 */
export function formatHarvestError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: number,
): string {
  let parsed: HarvestErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as HarvestErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const details = (parsed?.errors ?? []).map((entry) =>
    typeof entry === "string"
      ? entry
      : Object.entries(entry).map(([field, msg]) => `${field}: ${msg}`).join("; ")
  ).filter(Boolean);

  const parts = [
    `Greenhouse Harvest ${status} for ${method} ${path}`,
    parsed?.message ?? (raw ? truncate(raw, 200) : undefined),
    details.length > 0 ? details.join(" | ") : undefined,
    status === 403
      ? "403 means the credential is valid but this integration's scopes — or the Greenhouse " +
        "user the token acts as — do not cover this call. Every v3 GET requires a Site Admin " +
        "subject."
      : undefined,
    status === 429
      ? `rate limited; retry after ${retryAfter ?? "the Retry-After header's"} seconds`
      : undefined,
  ].filter(Boolean);

  return truncate(parts.join(": "), 1000);
}

export class HarvestClient {
  constructor(private ctx: HookContext) {}

  /**
   * One page of a list endpoint: the bare array plus the header-borne cursor.
   *
   * Deliberately not a generic `json()` that happens to return an array — the
   * cursor lives in a header, so a caller that only reads the body silently
   * loses the ability to page.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<HarvestPage<T>> {
    const res = await this.send(path, options);
    const rateLimit = readRateLimit(res.headers);
    const nextUrl = parseNextLink(res.headers.get("link"));
    const nextCursor = cursorFromUrl(nextUrl);
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : [];
    const items = (Array.isArray(parsed) ? parsed : [parsed]) as T[];
    return {
      items,
      ...(nextCursor ? { nextCursor } : {}),
      ...(nextUrl ? { nextUrl } : {}),
      hasMore: nextCursor !== undefined,
      rateLimit,
    };
  }

  /** Parse a single-entity body (`POST` 201, `PATCH` 200). */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Status only, for the lifecycle endpoints.
   *
   * `move`, `reject`, `unreject` and `hire` all answer **204 with no body** —
   * they mutate the application and return nothing, so an Action that tried to
   * parse a result would fail on success.
   */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    // No credential is set here on purpose: the runtime routes this request
    // through the Auth `sign` hook, which is the only code that sees one.
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
        formatHarvestError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          readRateLimit(res.headers).retryAfter,
        ),
      );
    }
    return res;
  }
}

/** Path-escape a caller-supplied id so a pasted `/` cannot escape its segment. */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}
