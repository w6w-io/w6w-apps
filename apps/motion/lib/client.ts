import type { HookContext } from "@w6w/types";

/**
 * Motion REST client (`api.usemotion.com`).
 *
 * Every path, verb, query parameter, body field and enum used by this app was
 * read off Motion's own API reference at `docs.usemotion.com/api-reference/…`
 * on 2026-08-11, and then confirmed against the live API on the same day. Nothing
 * came from a third-party integration directory.
 *
 * ## Verifying a Motion doc page is real
 *
 * `docs.usemotion.com` is a static Astro site with **no OpenAPI document and no
 * 404**: every unknown path answers `HTTP 200` with a byte-identical 46,637-byte
 * shell (`/sitemap.xml`, `/llms.txt`, `/openapi.json` and
 * `/api-reference/openapi.json` all return exactly that). A reference page is
 * therefore identified by its *size and content*, never by its status code —
 * `/api-reference/tasks/get/` is 274,735 bytes, `/api-reference/projects/get/`
 * is 134,116 and `/api-reference/comments/post/` is 63,951. The 31 real pages
 * are the ones linked from the site index's sidebar, which is server-rendered
 * into that same shell.
 *
 * None of the 31 pages contains `deprecat`, `sunset`, `will be removed` or
 * `end of life` (grepped 2026-08-11). The reference is alive, not merely
 * reachable.
 *
 * ## Two version prefixes on one host, and both are load-bearing
 *
 * The tasks / projects / comments / recurring-tasks / workspaces / users /
 * statuses / schedules endpoints live under **`/v1`**. Everything to do with
 * **custom fields** — the workspace field definitions *and* the per-task /
 * per-project values — lives under **`/beta`**. There is no `/v1` alias:
 * `GET /v1/workspaces/{id}/custom-fields` answers `404 Cannot GET …` while
 * `GET /beta/workspaces/{id}/custom-fields` answers `401 Unauthorized`
 * (measured). So the prefix is part of each call site's path, not a constant
 * folded into the base URL. See {@link V1} and {@link BETA}.
 *
 * ## `Content-Type` is validated before routing AND before auth
 *
 * This is the single most expensive thing to discover by hand. A `POST` or
 * `PATCH` that omits `content-type: application/json` is refused with:
 *
 *     HTTP/2 400
 *     {"message":"Invalid Headers","error":"Content-Type must be application/json",
 *      "statusCode":400}
 *
 * — and it is refused *before* the router and *before* the auth guard. Measured
 * 2026-08-11: `POST /v1/users/me`, which is not a route at all, returns that
 * same 400 without the header and `404 Cannot POST /v1/users/me` with it. So a
 * missing header presents as "your request is malformed" on endpoints that do
 * not exist and on endpoints whose credential is wrong, which sends you looking
 * in three wrong places. {@link MotionClient} therefore always sets the header
 * on a body-carrying request, even when the body is `{}`.
 *
 * ## Route existence is checkable without a credential
 *
 * Motion's API is a NestJS app: an **unknown** route answers
 * `404 {"message":"Cannot <VERB> <path>","error":"Not Found","statusCode":404}`
 * from the router, while a **known** route answers
 * `401 {"message":"Unauthorized","statusCode":401}` from the auth guard. Every
 * one of the 27 endpoints this app calls was confirmed to exist that way, with
 * `/v1/task`, `/v1/definitely-not-real-zzz` and
 * `GET /beta/custom-field-values/task/{id}` as negative controls returning 404.
 *
 * ## Pagination is cursor-only, and the page size is not yours to choose
 *
 * Every list endpoint answers `{"meta": {"nextCursor"?, "pageSize"}, "<plural>": [...]}`
 * and accepts exactly one paging parameter, `cursor`. There is **no** `limit`,
 * `perPage` or `offset` anywhere in the reference — the server picks the page
 * size and reports it back in `meta.pageSize`. To walk a collection you resend
 * the identical query with `cursor` set to the previous `meta.nextCursor`, and
 * you stop when `nextCursor` is absent.
 *
 * Four endpoints break the envelope and answer a **bare JSON array**:
 * `GET /v1/statuses`, `GET /v1/schedules`, `GET /beta/workspaces/{id}/custom-fields`
 * and — per the reference — they carry no `meta` and no cursor at all. Those are
 * read with {@link MotionClient.json} and wrapped in `{ items }` by their
 * actions rather than being run through the envelope reader.
 *
 * ## Rate limits are a fixed tier, not a readable budget
 *
 * The vendor's own "Rate limits" page: **12 requests/minute** for an individual,
 * **up to 120/minute** for a team on request, higher on enterprise. No
 * `X-RateLimit-*` header appeared on any live response measured (20 consecutive
 * unauthenticated calls plus 404s and 400s carried only `date`, `content-type`,
 * `content-length`, `server`, `etag`, `cf-cache-status` and `cf-ray`), and the
 * reference documents no endpoint reporting consumption. 12/minute is low enough
 * that a loop over a paginated collection will hit it, so {@link formatMotionError}
 * says so on a 429 instead of surfacing a bare status.
 */

/** The one and only API origin. The reference names no regional or sandbox host. */
export const API_BASE = "https://api.usemotion.com";

/** Prefix for the stable surface: tasks, projects, comments, recurring tasks, workspaces, users, statuses, schedules. */
export const V1 = "/v1";

/**
 * Prefix for the custom-field surface. Motion ships it under `/beta`, and there
 * is no `/v1` equivalent — using the wrong prefix produces a router 404, not a
 * redirect.
 */
export const BETA = "/beta";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /**
   * Serialized as JSON. Its presence is what makes the client send
   * `content-type: application/json`, which Motion validates before routing.
   * Pass `{}` for a body-less POST rather than omitting this.
   */
  body?: unknown;
}

/** The envelope every list endpoint returns, minus the collection key. */
export interface MotionPageMeta {
  nextCursor?: string;
  pageSize?: number;
}

/**
 * Motion's error body.
 *
 * Two shapes were observed live: `{"message":"Unauthorized","statusCode":401}`
 * and `{"message":"Cannot GET /x","error":"Not Found","statusCode":404}`. NestJS
 * also emits `message` as a string ARRAY for validation failures; that form was
 * not observable without a credential, so {@link formatMotionError} handles both
 * rather than assuming the scalar.
 */
interface MotionErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/** Drop keys the caller left unset, keeping an explicit `null` (it is meaningful in a body). */
export function omitUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== "") out[key] = value;
  }
  return out;
}

/**
 * Accept a `json` param as either an already-parsed value or the text a user
 * typed, **preserving an explicit `null`**.
 *
 * The distinction matters exactly once, and it is not cosmetic: Motion documents
 * `autoScheduled` as `object | null`, where the object turns auto-scheduling on
 * and `null` turns it *off*. Collapsing `null` into "absent" would make it
 * impossible to disable auto-scheduling through this app at all.
 */
export function optionalJson<T>(value: unknown, label: string): T | null | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is an error. */
export function requiredJson<T>(value: unknown, label: string): T {
  const parsed = optionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed as T;
}

/**
 * Normalise an `array` param into a list of non-empty strings.
 *
 * Only ever used for **request-body** arrays (`labels`, and nothing else). Query
 * arrays are deliberately not exposed — see the note in `lib/params.ts`.
 */
export function toStringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const items = raw.map((v) => String(v).trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Render a boolean query parameter, or omit it.
 *
 * `true` becomes the string `"true"`; `false` and `undefined` both become
 * absence. Motion's reference carries no example request, so how it parses a
 * *false* value is unspecified — and on an Express/Nest stack the plausible
 * readings disagree, since a naive handler treats the non-empty string
 * `"false"` as truthy. Every boolean query parameter this app sends is
 * documented as defaulting to off, so expressing `false` as absence is both
 * safe and exactly the documented default.
 */
export function flag(value: boolean | undefined): string | undefined {
  return value === true ? "true" : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Motion ids are opaque strings; escaping neutralises a `/` or `?` someone
 * pastes into an id field, which would otherwise silently address a different
 * route.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Flatten NestJS's `message`, which is a string on an HTTP error and an array on a validation error. */
export function messageText(message: string | string[] | undefined): string | undefined {
  if (message === undefined) return undefined;
  return Array.isArray(message) ? message.join("; ") : message;
}

/**
 * Turn a Motion error body into one actionable line.
 *
 * The three cases that carry real information get a sentence of their own,
 * because each has a different fix and all three arrive looking like "the
 * request failed":
 *
 *  - **400 `Invalid Headers`** — the `content-type` guard fired. This client
 *    always sets the header, so seeing it means a request was built outside
 *    {@link MotionClient}.
 *  - **401** — byte-identical for every credential problem (see
 *    `auth/api-key.ts`), so the message names the possibilities rather than
 *    picking one.
 *  - **429** — the individual tier is 12 requests/minute, which a paging loop
 *    reaches quickly, so the ceiling is quoted rather than left to be looked up.
 *
 * The message can carry only Motion's own prose and the caller's own input; the
 * credential never enters this module.
 */
export function formatMotionError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: MotionErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as MotionErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const detail = messageText(parsed?.message);
  const head = `Motion ${status} for ${method} ${path}`;
  if (!parsed || (!detail && !parsed.error)) return `${head}: ${truncate(raw)}`;

  const parts: Array<string | undefined> = [head, parsed.error, detail];

  // `message` and `error` swap roles between Motion's two observed shapes, so
  // both are searched. On the 404 the router emits, `message` is the sentence
  // ("Cannot GET /v1/x") and `error` is the category ("Not Found"); on the 400
  // the header guard emits, `message` is the category ("Invalid Headers") and
  // `error` is the sentence ("Content-Type must be application/json"). Reading
  // only one of them silently drops half of every diagnosis.
  const whole = `${detail ?? ""} ${parsed.error ?? ""}`;

  if (status === 400 && /content-type/i.test(whole)) {
    parts.push(
      "Motion validates Content-Type before routing and before auth — this request reached it " +
        "without content-type: application/json",
    );
  }
  if (status === 401) {
    parts.push(
      "Motion returns this same body whether the key is missing, empty, revoked or sent under " +
        "the wrong header name — reconnect the Connection to rule the credential in or out",
    );
  }
  if (status === 429) {
    parts.push(
      "Motion rate-limits per API key: 12 requests/minute on the individual tier, up to " +
        "120/minute for teams — retry with backoff",
    );
  }

  return truncate(parts.filter(Boolean).join(": "), 1000);
}

export class MotionClient {
  constructor(private ctx: HookContext) {}

  /**
   * Parse the JSON body. `path` carries its own version prefix ({@link V1} or
   * {@link BETA}) because Motion serves two on one host.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A list page: the envelope plus the collection under `key`.
   *
   * Returned rather than flattened so `meta.nextCursor` survives to the next
   * workflow step — it is the only way to page a Motion collection, and an
   * action that dropped it would cap every query at one server-chosen page.
   */
  async page<T = unknown>(
    path: string,
    key: string,
    options: RequestOptions = {},
  ): Promise<{ items: T[]; meta: MotionPageMeta }> {
    const body = await this.json<Record<string, unknown>>(path, options);
    const record = (body ?? {}) as Record<string, unknown>;
    const items = record[key];
    return {
      items: Array.isArray(items) ? items as T[] : [],
      meta: (record.meta ?? {}) as MotionPageMeta,
    };
  }

  /** Status only, for the deletes — the reference documents no response body for any of them. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    // No `authorization` / `x-api-key` here by design: the credential is stamped
    // by the Auth `sign` hook, which is the only code that ever sees it.
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // Unconditional: Motion refuses a body-carrying request without it, before
      // routing and before auth. An empty object still needs the header.
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatMotionError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
