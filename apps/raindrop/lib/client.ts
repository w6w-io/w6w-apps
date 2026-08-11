import type { HookContext } from "@w6w/types";

/**
 * Raindrop.io REST API v1 client.
 *
 * Every path, verb, body field and enum in this module was read off Raindrop's
 * own reference on 2026-08-11 — `developer.raindrop.io`, whose GitBook serves a
 * Markdown projection of every page (append `.md`; the index is
 * `developer.raindrop.io/llms.txt`) — and cross-checked with live probes against
 * `api.raindrop.io`. Nothing here came from a third-party integration directory.
 *
 * ## One host, one prefix
 *
 * `https://api.raindrop.io/rest/v1`. There is no regional host, no sandbox and
 * no per-tenant subdomain, so nothing about the origin is derived from the
 * credential.
 *
 * The **OAuth endpoints are the exception** and do not carry the `/rest`
 * segment: the documented `https://raindrop.io/oauth/authorize` and
 * `.../oauth/access_token` answer `307` with
 * `location: https://api.raindrop.io/v1/oauth/…` (measured 2026-08-11). See
 * {@link OAUTH_AUTHORIZE_URL}.
 *
 * ## Singular for one, plural for many — and they are different routes
 *
 * `/collection/{id}` is one collection; `/collections` is the root list.
 * `/raindrop/{id}` is one bookmark; `/raindrops/{collectionId}` is a
 * collection's worth. The plural form of a *single-item* path is not an alias,
 * it is a different endpoint with a different body, which is why
 * {@link RaindropClient} never pluralises a path for you.
 *
 * ## `result: false` is not always an error, and HTTP 200 is not always success
 *
 * The envelope is `{"result": true, …}` and the payload key varies by endpoint:
 * `item` (one), `items` (many), or bare fields (`/filters/{id}` puts `broken`,
 * `tags`, `types` at the top level). Errors carry
 * `{"result": false, "error"?, "errorMessage"}`.
 *
 * Three measured deviations mean the flags and the status code have to be read
 * separately rather than collapsed into one "is this ok" test:
 *
 *  1. **`POST /import/url/exists` answers `{"result": false, "ids": []}` when
 *     none of the URLs is saved** — a completely successful "no matches".
 *     Treating `result: false` as failure there turns the normal answer into a
 *     thrown error, so `url-exists` reads the body with {@link RaindropClient.json}
 *     rather than {@link RaindropClient.ok}.
 *  2. **`GET /import/url/parse` answers `{"result": true, "error": "not_found",
 *     "errorMessage": "invalid_url", "item": {…}}`** — `result` is *true* while
 *     an `error` field is present, because the parse itself succeeded and only
 *     the remote page did not. That is data, not a failure.
 *  3. **The OAuth token endpoint answers HTTP 200 with `{"result": false,
 *     "status": 400, "errorMessage": "client_id or client_secret is invalid"}`**
 *     (measured live). A client that trusts `res.ok` there stores a credential
 *     that was never issued. See `auth/oauth2.ts`.
 *
 * So: {@link RaindropClient.json} parses and returns; {@link RaindropClient.ok}
 * additionally enforces `result !== false`; and the three endpoints above opt
 * out deliberately and say why at the call site.
 *
 * ## The 401 says nothing about the path
 *
 * Authentication runs *before* routing. `GET /rest/v1/nonexistent-zzz` answers
 * the same 72-byte `{"result":false,"status":401,"errorMessage":"Unauthorized",
 * "auth":false}` as `GET /rest/v1/user` does (both measured 2026-08-11, byte
 * identical). An unauthenticated probe therefore cannot tell a real endpoint
 * from a typo — which is why every path in this app is taken from the vendor's
 * reference rather than confirmed by poking the API.
 *
 * The **body** does distinguish the two credential failures, and that is what
 * `auth/*.ts` classifies on:
 *
 *   | Request                       | Status | `errorMessage`             |
 *   | ----------------------------- | ------ | -------------------------- |
 *   | no `Authorization` header     | 401    | `Unauthorized`             |
 *   | `Authorization: Bearer bogus` | 401    | `Incorrect access_token`   |
 *
 * ## Rate limits
 *
 * 120 requests/minute per authenticated user, reported by `X-RateLimit-Limit` /
 * `RateLimit-Remaining` / `X-RateLimit-Reset` (the vendor's own spelling — note
 * the middle one carries no `X-` prefix in the documentation). `health/quota.ts`
 * reads both spellings and explains why their presence could not be verified
 * without a live credential.
 */

/** The one API origin. */
export const API_BASE = "https://api.raindrop.io";

/** Every REST path carries this prefix. The OAuth routes do NOT — see below. */
export const API_PREFIX = "/rest/v1";

/**
 * OAuth authorization endpoint.
 *
 * The reference's prose gives `https://raindrop.io/oauth/authorize`, but its own
 * cURL example gives `https://api.raindrop.io/v1/oauth/authorize`, and the wire
 * settles it: on 2026-08-11 `https://raindrop.io/oauth/authorize?…` answered
 * `307` with `location: https://api.raindrop.io/v1/oauth/authorize?…` (query
 * preserved). The final URL is declared here so the browser hop and — more
 * importantly — the token `POST` never depend on a redirect being followed with
 * its method and body intact.
 *
 * Note `/v1/`, not `/rest/v1/`: the OAuth routes sit outside the REST prefix.
 */
export const OAUTH_AUTHORIZE_URL = `${API_BASE}/v1/oauth/authorize`;

/** Token exchange **and** refresh. Same URL, distinguished by `grant_type`. */
export const OAUTH_TOKEN_URL = `${API_BASE}/v1/oauth/access_token`;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`, as the vendor requires. */
  body?: unknown;
}

/** The success envelope. `item`, `items` or bare fields depending on the endpoint. */
export interface RaindropEnvelope {
  result?: boolean;
  item?: unknown;
  items?: unknown[];
  error?: unknown;
  errorMessage?: string;
  [key: string]: unknown;
}

/**
 * The system collection ids. They are not returned by any list endpoint, so a
 * caller who does not know they exist cannot discover them.
 */
export const SYSTEM_COLLECTIONS = {
  /** Everything except Trash. Accepted by the read paths; NOT by update/remove. */
  all: 0,
  unsorted: -1,
  trash: -99,
} as const;

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `nested=false` and `collectionId=0` are both
 * meaningful — `0` is the id of "all collections" — and dropping them would make
 * them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Raindrop ids are integers (collections, raindrops, users) or 24-character hex
 * (highlights, backups), so nothing legitimate needs escaping — but a `/` or `?`
 * pasted into an id field must not be able to reach a different route.
 */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Coerce a collection id, keeping the negative system ids intact.
 *
 * A host may hand a `number` param through as a string. `Number("-99")` is
 * `-99`, but `encodeURIComponent` on a stray `" -99 "` is not, so this normalises
 * once rather than at twenty call sites.
 */
export function collectionId(value: number | string): number {
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) throw new Error(`collection id is not a number: ${String(value)}`);
  return n;
}

/** Keep an error message readable — a Mongoose validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Normalise a tag list.
 *
 * The tag endpoints take `tags` as an array of strings even when the operation
 * is "rename one tag" (the reference is explicit: "Specify **array** with
 * **only one** string"), so a single typed tag has to become `["tag"]` rather
 * than `"tag"`.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Same for a list of integer ids. */
export function toIdList(
  v: Array<number | string> | string | undefined | null,
): number[] | undefined {
  const parts = Array.isArray(v) ? v.map(String) : toList(v as string | undefined);
  if (!parts) return undefined;
  const ids = parts.map((p) => Number(String(p).trim())).filter((n) => Number.isFinite(n));
  return ids.length ? ids : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host passes a `json` param through in whichever shape it arrived, so both
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
 * Turn a Raindrop failure into one actionable line.
 *
 * The vendor reports errors three ways and all three are folded in here:
 *
 *  - `errorMessage` — the prose. Present on essentially every failure.
 *  - `error` — sometimes a stable string code (`file_invalid`,
 *    `CollaboratorsIncorrectToken`, `not_found`), sometimes a small integer
 *    (`1`, `2`, `3` on `PUT /user`), sometimes the offending field name
 *    (`"view"`, `"config.raindrops_sort"`). It is kept verbatim because when it
 *    *is* a field name it points straight at the input that has to change.
 *  - `status` — the vendor's own status, which is not always the HTTP status.
 *
 * The message can carry only Raindrop's own prose and the caller's own input;
 * the credential never enters this module.
 */
export function formatRaindropError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: RaindropEnvelope | null = null;
  try {
    parsed = JSON.parse(raw) as RaindropEnvelope;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (parsed.errorMessage === undefined && parsed.error === undefined)) {
    return `Raindrop ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const code = parsed.error === undefined || parsed.error === null || parsed.error === ""
    ? undefined
    : String(parsed.error);
  const vendorStatus = typeof parsed.status === "number" && parsed.status !== status
    ? ` (body says ${parsed.status})`
    : "";

  const parts = [
    `Raindrop ${status}${vendorStatus}${code ? ` ${code}` : ""} for ${method} ${path}`,
    parsed.errorMessage,
    status === 429
      ? "Raindrop allows 120 requests/minute per authenticated user; retry after the window resets"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class RaindropClient {
  constructor(private ctx: HookContext) {}

  /**
   * Parse the body. Does **not** inspect `result`.
   *
   * For the two endpoints whose `result` flag is data rather than a verdict:
   * `POST /import/url/exists` (`result: false` means "none of these URLs is
   * saved") and `GET /import/url/parse` (`result: true` alongside an `error`
   * field means the page could not be fetched).
   */
  async json<T = RaindropEnvelope>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return {} as T;
    const text = await res.text();
    if (!text.trim()) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // A few endpoints answer prose rather than JSON — `GET /backup` returns
      // "We will send you email…". Surfacing the text beats a parse error.
      return { result: true, message: text } as T;
    }
  }

  /**
   * Parse, then enforce the envelope's own verdict.
   *
   * A `2xx` carrying `{"result": false}` is a failure the HTTP status did not
   * report, and this is where that is caught for the endpoints where the flag
   * really is a verdict.
   */
  async ok(path: string, options: RequestOptions = {}): Promise<RaindropEnvelope> {
    const body = await this.json<RaindropEnvelope>(path, options);
    if (body && body.result === false) {
      throw new Error(
        formatRaindropError(200, options.method ?? "GET", path, JSON.stringify(body)),
      );
    }
    return body ?? {};
  }

  /** `{"result": true, "item": …}` in, `item` out. */
  async item<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T | undefined> {
    return (await this.ok(path, options)).item as T | undefined;
  }

  /** `{"result": true, "items": […]}` in, `items` out — never `undefined`. */
  async items<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T[]> {
    const body = await this.ok(path, options);
    return Array.isArray(body.items) ? body.items as T[] : [];
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    // No `authorization` header here, by construction: the runtime routes this
    // request through the Auth `sign` hook, which is the only code that ever
    // sees the credential.
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // The vendor's own note: "Payload of POST requests has to be JSON-encoded
      // and accompanied with Content-Type: application/json header."
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatRaindropError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
