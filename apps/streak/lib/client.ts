import type { HookContext } from "@w6w/types";

/**
 * Streak API v1 REST client.
 *
 * Base URL, auth scheme and every path/verb/field below were verified on
 * 2026-08-25 against Streak's own reference (`streak.readme.io`, a ReadMe.io
 * site backed by a real OpenAPI 3.1 document embedded in the page — extracted
 * from two of the site's rendered pages, `info.title` `streak-v1`) plus live
 * probes against `api.streak.com` and `status.streak.com`. Nothing here came
 * from a third-party integration directory.
 *
 * ## Three findings that shaped this client
 *
 *  1. **The three PUT "create" endpoints take a FORM body, not JSON** —
 *     `PUT /pipelines`, `PUT /pipelines/{key}/stages` and
 *     `PUT /pipelines/{key}/fields` all declare
 *     `application/x-www-form-urlencoded` in the spec, while every other
 *     write in this API (including the sibling POST "update" endpoints on
 *     the same resources) is `application/json`. Sending JSON to a create
 *     endpoint is answered with a `400` and an empty body — nothing in the
 *     response says why. See {@link putForm}.
 *  2. **List endpoints use three different envelopes, not one.** `GET
 *     /pipelines`, `.../fields` and `.../boxes` answer a bare JSON array;
 *     `GET /pipelines/{key}/stages` answers an object KEYED BY STAGE ID
 *     (`{"5001": {...}, "5002": {...}}`), not an array or a map with a
 *     `results` key; `GET /boxes/{key}/tasks` and `GET /users/me/teams`
 *     wrap the array under `{"results": [...]}`; and `GET /search` wraps a
 *     further-nested `{"results": {"boxes": [...], "contacts": [...],
 *     "orgs": [...]}}`. Four shapes for "a list of things," and guessing
 *     the wrong one is a parse error, not a helpful one.
 *  3. **Two different 401 bodies for two different auth failures**, checked
 *     live: no credential at all answers `{"error": "Authentication
 *     required"}`, while a syntactically-plausible but wrong key answers
 *     `{"success": false, "error": "invalid api key"}` — a different shape,
 *     not just a different message. See `auth/api-key.ts`.
 */

/** The one and only API origin, confirmed live and by the vendor's own sample `curl` line. */
export const API_BASE = "https://api.streak.com/api/v1";

export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset, so an absent filter is never sent as the string `"undefined"`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied resource key.
 *
 * Streak keys are opaque tokens (`agxzfm1haWxmb29n...`) that may legally
 * contain `~` and other characters `encodeURIComponent` leaves untouched, but
 * never a literal `/` or `?` — this only guards against one being pasted in
 * by mistake and escaping the path segment it belongs in.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Both documented 401/400 shapes, plus the plain `{}` some 400s answer with.
 * `error` is a free-text sentence in both — Streak names no machine-readable
 * error code anywhere in this API, unlike Apify's `error.type`.
 */
export interface StreakErrorBody {
  error?: string;
  success?: boolean;
}

/** Keep an error message readable — Streak's own text is normally short, but never assume. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a Streak error response into one actionable line.
 *
 * Streak has no `error.type` code (contrast Apify) — the vendor's entire
 * error vocabulary is the free-text `error` string, so that string is kept
 * verbatim rather than collapsed into a generic "request failed."
 */
export function formatStreakError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: StreakErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as StreakErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.error;
  if (!message) {
    return raw.trim().length > 0
      ? `Streak ${status} for ${method} ${path}: ${truncate(raw)}`
      : `Streak ${status} for ${method} ${path}`;
  }
  return `Streak ${status} for ${method} ${path}: ${message}`;
}

/**
 * Accept a `json`-typed param as either a parsed value or the string a user
 * typed, and hand back the parsed value. The host passes a `json` param
 * through in whichever shape it arrived, so this is handled once here rather
 * than at every call site that needs it.
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
 * Some Streak write endpoints embed a JSON value as a STRING inside the outer
 * JSON body — `box-create`'s `assignedToSharingEntries` and `box-update`'s
 * `fields`, both documented with `format: "json"` on a `type: "string"`
 * property. Re-stringify here so callers can pass a normal object/array and
 * this app produces the double-encoded wire format Streak actually expects.
 */
export function toJsonString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
}

export class StreakClient {
  constructor(private ctx: HookContext) {}

  /** `GET` a JSON body. Used for every read/list action. */
  async get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return await this.json<T>(path, { method: "GET", query });
  }

  /**
   * `POST`/`PUT`/`DELETE` a JSON body — the shape every endpoint uses EXCEPT
   * the three form-urlencoded creates. See {@link putForm}.
   */
  async sendJson<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    const url = this.buildUrl(path, query);
    const res = await this.ctx.fetch(url, {
      method,
      headers: { accept: "application/json", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return await this.parse<T>(res, method, url);
  }

  /**
   * `PUT` a form-urlencoded body — the wire format Streak's own spec
   * declares for `create-a-pipeline`, `create-a-stage` and `create-a-field`,
   * and for no other write in this API. Sending JSON here answers `400`
   * with an empty body.
   */
  async putForm<T = unknown>(path: string, form: Record<string, QueryValue>): Promise<T> {
    const url = this.buildUrl(path);
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(compact(form))) body.set(k, String(v));
    const res = await this.ctx.fetch(url, {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    return await this.parse<T>(res, "PUT", url);
  }

  /** `DELETE` — Streak answers every successful delete with `{"success": true}`. */
  async del(path: string): Promise<{ success: boolean }> {
    return await this.sendJson<{ success: boolean }>("DELETE", path);
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(compact(query ?? {}))) {
      url.searchParams.set(k, String(v));
    }
    return url.toString();
  }

  private async json<T>(path: string, options: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const res = await this.ctx.fetch(url, {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    });
    return await this.parse<T>(res, options.method ?? "GET", url);
  }

  private async parse<T>(res: Response, method: string, url: string): Promise<T> {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatStreakError(res.status, method, new URL(url).pathname, text));
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Streak returned an unparseable body for ${method} ${new URL(url).pathname}`);
    }
  }
}
