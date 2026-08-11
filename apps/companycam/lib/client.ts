import type { HookContext } from "@w6w/types";

/**
 * CompanyCam Core API v2 REST client.
 *
 * Everything in this module was verified on 2026-08-11 against CompanyCam's own
 * OpenAPI 3.0 document — `github.com/CompanyCam/openapi-spec/openapi.yaml`,
 * 187,449 bytes, md5 `37293f27eff6886fbffe4c49e7f4f409`, last commit
 * 2026-08-07 — which is the same document ReadMe renders at
 * `docs.companycam.com/reference/*`, plus live probes against
 * `api.companycam.com`. Nothing here came from a third-party integration
 * directory.
 *
 * ## One host, one prefix
 *
 * The document declares exactly one server, `https://api.companycam.com/v2`.
 * There is no regional host and no sandbox environment, so nothing about the
 * host is derived from the credential.
 *
 * ## An unknown path answers 200, not 404 — measured
 *
 * This is the trap that makes "the request succeeded" worthless as evidence
 * here. Measured 2026-08-11:
 *
 *   | Request                             | Answer                                  |
 *   | ----------------------------------- | --------------------------------------- |
 *   | `GET /v2/projects` (no credential)  | `401` `{"errors":["Unauthorized"]}`     |
 *   | `GET /v2/not-a-real-endpoint-zzz`   | `302` -> `/users/sign_in`               |
 *   | ...following that redirect          | **`200` 18,795 bytes of HTML**          |
 *
 * So a typo in a path does not 404: it redirects to the web sign-in page, and
 * any client that follows redirects (which `fetch` does by default) sees a
 * cheerful `200` carrying an HTML login form. {@link CompanyCamClient.send}
 * therefore rejects a non-JSON success body outright — see
 * {@link NON_JSON_HINT}. The inverse is just as useful and is why the auth
 * probe is safe: a JSON `401` from this API proves the path exists.
 *
 * ## Bare arrays, no envelope
 *
 * Every list endpoint returns a **bare JSON array**. There is no `{data: …}`
 * wrapper, no `total`, and no `next` link in the body, so a caller cannot tell
 * "last page" from "a full page that happens to be the end" except by asking
 * for another one. {@link CompanyCamClient.list} normalises that into
 * `{items, count}` and adds the cursor fields where the vendor publishes them.
 *
 * ## Cursor pagination exists on exactly two endpoints, and only in headers
 *
 * `GET /v2/photos` and `GET /v2/projects/{id}/photos` accept `after` / `before`
 * and answer with `X-Next-Cursor`, `X-Prev-Cursor`, `X-Has-Next` and
 * `X-Has-Prev` **response headers**. Those four are the only way to page
 * forward reliably, and because the body is a bare array they are invisible to
 * anything that only looks at the payload. `GET /v2/videos` says it "supports
 * the same filtering and pagination parameters as `/photos`", but its own
 * parameter list declares no `after`/`before`, so this app does not send them
 * there — see `actions/video-list.ts`.
 *
 * ## Errors
 *
 * Every failure is `{"errors": ["…"]}` — an array of strings, no code, no
 * field, no type. `401` in particular is byte-identical for "no credential
 * reached the API" and "the token is wrong or revoked" (both measured), which
 * is why {@link formatCompanyCamError} says so instead of guessing.
 *
 * ## Rate limits
 *
 * None documented, and none observable: the OpenAPI document declares no
 * rate-limit response headers (only the four pagination ones above), and no
 * `X-RateLimit-*` / `RateLimit-*` header appeared on any live response measured
 * on 2026-08-11. See `health/quota.ts`, which declares that absence rather than
 * inventing a headroom number.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.companycam.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

/**
 * The header that attributes a write to a CompanyCam user other than the one
 * the credential belongs to.
 *
 * **The vendor spells it two ways and only one of them can work.** The OpenAPI
 * document (and therefore every generated reference page) declares
 * `X-CompanyCam-User`; the "Defining the Current User" guide and its changelog
 * entry both write `X_COMPANYCAM_USER`, with underscores. Those are two
 * different headers, not two spellings of one: nginx — which `api.companycam.com`
 * runs, per the `server:` header measured on 2026-08-11 — drops underscored
 * request headers unless `underscores_in_headers` is turned on, and Rack maps
 * the dashed form to the same `HTTP_X_COMPANYCAM_USER` the app reads either way.
 *
 * So this app sends the dashed form the machine-readable spec declares. The
 * failure mode of picking wrong is silent: an ignored header does not error,
 * it attributes the photo, comment or document to the token's owner instead of
 * the person the workflow named.
 */
export const ACT_AS_HEADER = "x-companycam-user";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /**
   * Email address of the CompanyCam user to credit for this write. Not a
   * credential: it selects an existing user in the same company, it does not
   * authenticate anyone. See {@link ACT_AS_HEADER}.
   */
  actAs?: string;
}

/**
 * A list response, normalised.
 *
 * `count` is the number of rows in THIS page, not a total — the API publishes
 * no total anywhere. The cursor fields are populated only by the two photo
 * endpoints that send them.
 */
export interface ListPage<T> {
  items: T[];
  count: number;
  nextCursor?: string;
  prevCursor?: string;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/** The vendor's only error shape: `{"errors": ["Record not found"]}`. */
interface CompanyCamErrorBody {
  errors?: unknown;
}

/**
 * Explanation attached when the API answers a success status with a non-JSON
 * body, which on this API means the path did not exist and the request was
 * redirected to the web sign-in page.
 */
export const NON_JSON_HINT =
  "CompanyCam answered with a non-JSON body. An unknown /v2 path redirects to the web sign-in " +
  "page, so this usually means the endpoint does not exist rather than that the request failed.";

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `enabled=false` and `internal=false` are both
 * meaningful, and silently dropping them would make them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Every id in this API is an opaque numeric string, so nothing legal is lost by
 * escaping, and a `/` or `?` pasted into an id field is neutralised rather than
 * silently retargeting the request at another endpoint.
 */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
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

/** Normalise a `multiselect`/comma-separated param into a list of strings. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * The response field that carries a live secret, deleted before an Action
 * returns.
 *
 * `Webhook.token` is documented as "a string used to hash the webhook body for
 * verification" — it is the HMAC-SHA1 key CompanyCam signs every delivery with,
 * and the vendor's own guide tells receivers to compare against it. Anyone
 * holding it can forge a delivery that passes signature validation, so it is a
 * live credential returned inside an ordinary read: `GET /v2/webhooks`,
 * `GET /v2/webhooks/{id}`, and the create/update responses all carry it.
 *
 * A workflow step's result is persisted in the run record and routinely echoed
 * into logs, other apps and human-readable previews, so returning it would turn
 * one list call into a durable secret leak. It is dropped rather than masked:
 * a masked placeholder in a field named `token` reads like a value, and
 * something downstream will try to sign with it.
 *
 * The value stays available to its owner — they chose it, since `token` is
 * supplied by the caller when the webhook is created.
 */
export const REDACTED_FIELDS = ["token"] as const;

/**
 * Remove {@link REDACTED_FIELDS} from a webhook entity, returning a shallow
 * copy.
 *
 * Deliberately narrow: it deletes one named key off one entity type rather than
 * scrubbing anything that looks secret, because a heuristic that ate a user's
 * own field named `token` would corrupt project data — and project data is the
 * whole payload of this app.
 */
export function stripWebhookSecret<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out.token;
  return out as T;
}

/** {@link stripWebhookSecret}, mapped over a list page. */
export function stripWebhookSecrets<T>(page: ListPage<T>): ListPage<T> {
  return { ...page, items: page.items.map((item) => stripWebhookSecret(item)) };
}

/**
 * Turn CompanyCam's error body into one actionable line.
 *
 * The body is `{"errors": [...]}` and carries no machine code at all, so the
 * status is the only classifier available — and it classifies less than it
 * looks like it does. Both "no credential reached the API" and "this token is
 * wrong or revoked" answer `401 {"errors":["Unauthorized"]}`, byte for byte
 * (measured 2026-08-11 with no header and with a bogus bearer token). Saying so
 * is more useful than picking one and being wrong half the time.
 *
 * The message can carry only CompanyCam's own prose and the caller's own input;
 * the credential never enters this module.
 */
export function formatCompanyCamError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let messages: string[] = [];
  try {
    const parsed = JSON.parse(raw) as CompanyCamErrorBody;
    const errors = parsed?.errors;
    if (Array.isArray(errors)) messages = errors.map((e) => String(e));
    else if (typeof errors === "string") messages = [errors];
  } catch { /* not JSON — fall through to the raw body */ }

  const detail = messages.length > 0 ? messages.join("; ") : truncate(raw);
  const parts = [`CompanyCam ${status} for ${method} ${path}`, detail || undefined];

  if (status === 401) {
    parts.push(
      "This API answers an identical 401 whether no credential arrived or the token was " +
        "rejected, so check both: that the connection is still linked, and that the token has " +
        "not been revoked in CompanyCam",
    );
  }
  if (status === 404) {
    parts.push("A missing record and a mistyped id are the same 404 here");
  }
  return truncate(parts.filter(Boolean).join(": "), 1000);
}

export class CompanyCamClient {
  constructor(private ctx: HookContext) {}

  /**
   * Parse a single-entity response.
   *
   * `204` (every delete) and an empty body both come back as `undefined`
   * rather than as a parse error.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Parse a list response into {@link ListPage}.
   *
   * The body is a bare array, so `count` is derived here; the cursor fields
   * come from response headers and are simply absent on the endpoints that do
   * not send them.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ListPage<T>> {
    const res = await this.send(path, options);
    const text = res.status === 204 ? "" : await res.text();
    const parsed = text ? JSON.parse(text) : [];
    const items = (Array.isArray(parsed) ? parsed : [parsed]) as T[];

    const page: ListPage<T> = { items, count: items.length };
    // Empty-string cursors mean "no further page"; the vendor documents them as
    // "Empty if no more results", so an empty header is an absent cursor.
    const next = res.headers.get("x-next-cursor");
    const prev = res.headers.get("x-prev-cursor");
    const hasNext = res.headers.get("x-has-next");
    const hasPrev = res.headers.get("x-has-prev");
    if (next) page.nextCursor = next;
    if (prev) page.prevCursor = prev;
    if (hasNext !== null) page.hasNext = hasNext === "true";
    if (hasPrev !== null) page.hasPrev = hasPrev === "true";
    return page;
  }

  /** Status only, for the endpoints that answer `204` with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.send(path, options);
    return { status: res.status };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.actAs) headers[ACT_AS_HEADER] = options.actAs;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const method = init.method ?? "GET";
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatCompanyCamError(res.status, method, url.pathname, detail));
    }

    // See the module docs: a 200 carrying HTML is what a mistyped path looks
    // like on this API, so it must not be parsed as data.
    const contentType = res.headers.get("content-type") ?? "";
    if (res.status !== 204 && contentType && !/\bjson\b/i.test(contentType)) {
      throw new Error(
        `CompanyCam ${res.status} for ${method} ${url.pathname}: ${NON_JSON_HINT} ` +
          `(content-type: ${contentType})`,
      );
    }
    return res;
  }
}
