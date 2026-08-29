import type { HookContext } from "@w6w/types";

/**
 * WhatConverts API v1 REST client.
 *
 * Everything in this module was verified on 2026-08-29 against WhatConverts's own
 * published reference (`whatconverts.com/api/{overview,accounts,profiles,users,roles,
 * leads,recordings,tracking}/`) plus live probes against `app.whatconverts.com`.
 * WhatConverts publishes prose documentation, not an OpenAPI/Postman document — every
 * path, parameter and response field below was read off those pages directly.
 *
 * ## Base URL and auth
 *
 * One fixed host: `https://app.whatconverts.com/api/v1`. Every request carries HTTP
 * Basic auth — an API token as the username, its paired secret as the password — via
 * `auth/basic.ts`'s `sign` hook. Confirmed live: an unauthenticated request answers
 * `401 {"error_message":"Authentication not provided."}`, a syntactically-plausible but
 * wrong pair answers `401 {"error_message":"Authentication failed."}`. Both are distinct,
 * stable, machine-checkable strings, so `auth/basic.ts` classifies on the message rather
 * than the shared 401 status code.
 *
 * WhatConverts documents two credential kinds sharing this one client:
 *  - a **Profile Key**, scoped to one profile, usable against `/leads`, `/recording` and
 *    `/tracking/*`;
 *  - a **Master Account Key** ("Agency Key", agency plan only), additionally required for
 *    `/accounts`, `/accounts/{id}/profiles`, `/roles` and `/users`, and able to pass
 *    `account_id`/`profile_id` filters into the profile-scoped endpoints.
 * This app does not attempt to tell which kind a given credential is — the vendor's own
 * 401 on the agency-only resources already reports that distinction per call.
 *
 * ## One error shape
 *
 * Every documented failure is `{"error_message": "..."}` with a 4xx/5xx status; there is
 * no machine-readable error *code* alongside the message, so {@link formatWhatConvertsError}
 * surfaces the message text verbatim rather than inventing a taxonomy the vendor doesn't
 * publish. A request to an undeclared path (a typo, or an endpoint this client does not
 * yet cover) does NOT hit this shape at all — it 404s into the WhatConverts *web app's*
 * own HTML "page couldn't be found" shell (confirmed live), so a non-JSON body is reported
 * as such rather than parsed as if it were the API's error envelope.
 *
 * ## JSON body for writes — one resource states it, the rest are inferred
 *
 * Only the Users page states the wire format explicitly: "The body of the request must
 * contain a JSON object with the following fields." Accounts, Profiles and Leads document
 * their `POST` parameters as a flat table without naming a content type. This client sends
 * `application/json` for every write, on the strength of the one resource that is explicit
 * and because every list/get response is JSON-only with no alternate representation
 * offered — but this is inference, not a confirmed fact for Accounts/Profiles/Leads
 * specifically, and is called out again at each write action.
 *
 * ## Pagination, per resource
 *
 * Every list endpoint returns its own page-size field (`leads_per_page`,
 * `accounts_per_page`, `profiles_per_page`, `roles_per_page`, `users_per_page`,
 * `numbers_per_page`, `forms_per_page`) alongside `page_number`, `total_pages` and a
 * resource-named total — never a single normalized field name. Each list action reads its
 * own resource's names rather than a shared shape.
 *
 * ## No documented rate-limit headers
 *
 * The vendor states the ceiling in prose (10,000 requests/day per key; 1 request/ms and
 * up to 20 concurrent) but confirmed live that a successful and a 401 response both carry
 * no `X-RateLimit-*`/`Retry-After` header of any kind — so this app declares no `quota`
 * health check; there is nothing to read.
 */

/** The one and only API origin + version prefix WhatConverts documents. */
export const API_BASE = "https://app.whatconverts.com/api/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface WhatConvertsErrorBody {
  error_message?: string;
}

/** Drop keys the caller left unset — `false` and `0` survive; both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Render a boolean the way a WhatConverts query parameter documents it — the literal
 * words `true`/`false` in the querystring, not `1`/`0`. `undefined` drops the parameter
 * entirely, leaving the vendor's own documented default in force.
 */
export function boolParam(v: boolean | undefined): string | undefined {
  return v === undefined ? undefined : v ? "true" : "false";
}

/** Accept a `json`-typed param as either an already-parsed object or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a vendor error string is not bounded in length. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a WhatConverts error response into one actionable line.
 *
 * A non-JSON body (the web app's own 404 HTML shell for a bad path, confirmed live) is
 * reported as raw text rather than silently swallowed by a failed `JSON.parse`.
 */
export function formatWhatConvertsError(
  status: number,
  method: string,
  path: string,
  raw: string,
  contentType: string,
): string {
  if (contentType.toLowerCase().includes("json")) {
    let parsed: WhatConvertsErrorBody | null = null;
    try {
      parsed = JSON.parse(raw) as WhatConvertsErrorBody;
    } catch { /* fall through to the raw body */ }
    if (parsed?.error_message) {
      return `WhatConverts ${status} for ${method} ${path}: ${parsed.error_message}`;
    }
  }
  return `WhatConverts ${status} for ${method} ${path}: ${truncate(raw || "(empty body)")}`;
}

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export class WhatConvertsClient {
  constructor(private ctx: HookContext) {}

  async get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return await this.send<T>("GET", path, { query });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.send<T>("POST", path, { body });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return await this.send<T>("DELETE", path);
  }

  /** For `/recording`, which answers an MP3 byte stream rather than JSON. */
  async raw(
    path: string,
    query?: Record<string, QueryValue>,
  ): Promise<{ status: number; contentType: string; bytes: Uint8Array }> {
    const url = this.buildUrl(path, query);
    const res = await this.ctx.fetch(url.toString(), { headers: { accept: "audio/mpeg" } });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatWhatConvertsError(res.status, "GET", url.pathname, detail, contentType),
      );
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { status: res.status, contentType, bytes };
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  private async send<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatWhatConvertsError(res.status, method, url.pathname, text, contentType));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** base64-encode raw bytes (no url-safe transform) — for the MP3 recording action. */
export function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
