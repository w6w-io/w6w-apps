import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * GoTo Webinar REST API v2 client.
 *
 * Everything in this module was verified on 2026-09-05 against the vendor's own
 * Postman collection (`GoTo Webinar 2.0 REST API`, embedded as `openApi.postman.collection`
 * in the page data GraphQL response for `https://developer.goto.com/GoToWebinarV2/`, a live,
 * ReadMe/Gatsby-style developer portal — no third-party integration directory) plus live
 * probes against `api.getgo.com`.
 *
 * ## One host for the product API, a different one for OAuth
 *
 * The collection's own `baseUrl` variable is `https://api.getgo.com/G2W/rest/v2` — every
 * webinar/registrant/session/panelist/webhook/subscription path in this app hangs off that
 * prefix. GoTo's Identity API (`GET /identity/v1/Users/me`, used by the auth `test` and
 * `afterConnect` hooks) lives on the SAME host (`api.getgo.com`), so `network.allow` needs
 * only that one hostname for the whole app. OAuth itself is a THIRD host again,
 * `authentication.logmeininc.com` — GoTo's shared, cross-product identity provider (still
 * branded LogMeIn, GoTo's former parent company name) — but that host never needs restating
 * in `network.allow` because the runtime allows an `oauth2` block's declared hosts implicitly.
 *
 * A live, unauthenticated probe against the webinar API confirmed the host answers with a
 * real AWS API Gateway error, not a generic SPA 200:
 *
 * ```
 * GET https://api.getgo.com/G2W/rest/v2/organizers/123/webinars  (no Authorization header)
 * -> HTTP 403, x-amzn-errortype: UnauthorizedException
 *    {"int_err_code":"InvalidToken","msg":"Invalid token passed"}
 * ```
 *
 * ## Errors carry a vendor-specific body, not a generic one
 *
 * A failed call answers `{"int_err_code": "...", "msg": "..."}` (verified above) rather than
 * the RFC 6749 `{"error": "...", "error_description": "..."}` shape the *token* endpoint uses
 * (verified separately against `authentication.logmeininc.com/oauth/token`, which answered
 * `401 {"error":"invalid_client","error_description":"client not found"}` with an empty body
 * when unauthenticated identity API calls carried no Authorization header at all). Two
 * different services, two different error envelopes — {@link formatGotoError} reads
 * `int_err_code`/`msg` for the product+identity API and never assumes the OAuth shape.
 *
 * ## Pagination is not uniform across endpoints
 *
 * Every list endpoint is offset-paged with a zero-indexed `page`, but the *page-size*
 * parameter is spelled differently depending which resource is being listed:
 * `size` on `GET /organizers/{organizerKey}/webinars` and `.../sessions` and `.../attendees`,
 * but `limit` on `GET /organizers/{organizerKey}/webinars/{webinarKey}/registrants`. Both are
 * exposed here under their own documented name rather than papered over with one shared
 * `pageSize` param, because sending the wrong key to either endpoint is silently ignored
 * (GoTo does not reject an unknown query parameter) and the page-size cap quietly reverts to
 * the vendor default instead of erroring.
 *
 * Listing an account's/organizer's webinars additionally REQUIRES a `fromTime`/`toTime`
 * ISO-8601 UTC date range — there is no way to list "all" webinars unbounded by date. Omitting
 * either is a `400`, not an empty result.
 */

/** The product + identity API host. Declared once so a network.allow audit has one source. */
export const API_HOST = "api.getgo.com";

/** GoTo Webinar REST API v2 — verified `baseUrl` from the vendor's own Postman collection. */
export const API_URL = `https://${API_HOST}/G2W/rest/v2`;

/** GoTo's shared Identity API (SCIM-flavored) — same host as the webinar API. */
export const IDENTITY_URL = `https://${API_HOST}/identity/v1`;

/** GoTo's shared OAuth 2.0 provider — a different host, allowed implicitly via `oauth2`. */
export const OAUTH_AUTHORIZE_URL = "https://authentication.logmeininc.com/oauth/authorize";
export const OAUTH_TOKEN_URL = "https://authentication.logmeininc.com/oauth/token";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset, so a PATCH-shaped update doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

interface GotoErrorBody {
  int_err_code?: string;
  msg?: string;
}

/**
 * Turn a GoTo Webinar/Identity API error into one actionable line.
 *
 * `int_err_code` is the vendor's own stable machine code (`InvalidToken`, and others this app
 * has not enumerated because they were never observed live) — kept verbatim because it is a
 * different problem from a bare HTTP status, exactly as Apify's `error.type` is in this pack's
 * sibling apps.
 */
export function formatGotoError(status: number, method: string, path: string, raw: string): string {
  let parsed: GotoErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as GotoErrorBody;
  } catch {
    // not JSON — fall through to the raw body
  }
  if (!parsed || (!parsed.int_err_code && !parsed.msg)) {
    return `GoTo Webinar ${status} for ${method} ${path}: ${raw.slice(0, 500)}`;
  }
  const parts = [
    `GoTo Webinar ${status}${
      parsed.int_err_code ? ` ${parsed.int_err_code}` : ""
    } for ${method} ${path}`,
    parsed.msg,
  ].filter(Boolean);
  return parts.join(": ");
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes every request
 * through the auth `sign` hook.
 */
export class GotoWebinarClient {
  constructor(private ctx: HookContext) {}

  /** Parses and returns the JSON body (or `undefined` for a 204/empty response). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for actions (update/cancel/delete) that only care whether it succeeded. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
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
      throw new Error(formatGotoError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/** One webinar's meeting time window, shared by create/update/read. */
export interface WebinarTime {
  startTime: string;
  endTime: string;
}

interface GotoConnectionDisplay {
  organizerKey?: string;
}

/**
 * Resolve the organizerKey every Webinar endpoint needs: an explicit action param wins, else
 * the value `auth/oauth2.ts`'s `afterConnect` captured from `GET /identity/v1/Users/me` onto
 * the Connection's `display` (the collection's own note: "userKey and organizerKey ... contain
 * the same value"). Throws with an actionable message rather than sending a request GoTo will
 * 400 on, since the vendor's own error for a missing/malformed key is not obviously about this.
 */
export function resolveOrganizerKey(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as GotoConnectionDisplay;
  const fromConnection = display.organizerKey?.trim();
  if (fromConnection) return fromConnection;
  throw new Error(
    "no organizerKey — reconnect this connection (afterConnect captures it automatically) or " +
      "pass `organizerKey` on the action",
  );
}
