import type { HookContext } from "@w6w/types";

/**
 * Apify API v2 REST client.
 *
 * Everything in this module was verified on 2026-08-11 against Apify's own
 * machine-readable OpenAPI 3.1 document (`docs.apify.com/api/openapi.json`,
 * 999,786 bytes, `info.version` `v2-2026-08-05T133145Z`) plus live probes
 * against `api.apify.com`. Nothing came from a third-party integration
 * directory.
 *
 * ## One host, one prefix
 *
 * The OpenAPI document declares exactly one server, `https://api.apify.com`,
 * and every path in it carries the `/v2` prefix. There is no regional host and
 * no sandbox environment, so — unlike Paddle or Mailchimp — nothing about the
 * host is derived from the credential.
 *
 * The legacy `/v2/acts/...` prefix still routes to the same handlers as
 * `/v2/actors/...`, per the document's own "Legacy `/v2/acts/` URL prefix"
 * section. This app only ever builds the canonical `/v2/actors/...` form.
 *
 * ## Three response shapes, not one
 *
 * Most endpoints answer `{"data": …}`, and {@link ApifyClient.data} unwraps it.
 * But the vendor documents explicit exceptions, and getting them wrong is the
 * single most common way an Apify integration breaks:
 *
 *  - **Dataset items** (`GET /v2/datasets/{id}/items` and the `run-sync-get-dataset-items`
 *    endpoints) answer a **bare JSON array** — no envelope at all.
 *  - **Key-value store records** (`GET /v2/key-value-stores/{id}/records/{key}`)
 *    answer the **stored value verbatim**, in whatever content type it was
 *    written with. It is not JSON unless the record is.
 *  - **Run logs** (`GET /v2/actor-runs/{id}/log`) answer `text/plain`.
 *
 * So the client exposes {@link ApifyClient.data} (envelope),
 * {@link ApifyClient.json} (parse, no unwrap) and {@link ApifyClient.raw}
 * (text + content type) rather than pretending there is one shape.
 *
 * ## Errors
 *
 * Every failure is `{"error": {"type", "message"}}` with a 4xx/5xx status.
 * `type` is a stable machine code (`token-not-provided`,
 * `user-or-token-not-found`, `insufficient-permissions`, `record-not-found`,
 * `rate-limit-exceeded`, …) and is surfaced verbatim by
 * {@link formatApifyError}, because the fix differs per code and a flattened
 * "HTTP 403" hides which one you hit.
 *
 * ## Rate limits
 *
 * 250,000 requests/minute globally and 60 requests/second **per resource** by
 * default (200/s for key-value-store record CRUD, 400/s for run/push
 * endpoints). Responses carry `X-RateLimit-Limit` — the ceiling, never a
 * remaining count. See `health/quota.ts` for what that means for headroom
 * reporting.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.apify.com";

/** Every documented path carries this prefix; `/v2/acts/...` is the deprecated alias. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Pre-serialized body, for records stored under a non-JSON content type. */
  rawBody?: { contentType: string; text: string };
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

/** Apify's offset/limit envelope, returned by every list endpoint except KVS keys. */
export interface ApifyListPage<T> {
  total?: number;
  offset?: number;
  limit?: number;
  count?: number;
  desc?: boolean;
  items: T[];
}

interface ApifyErrorBody {
  error?: { type?: string; message?: string };
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `desc=false` and `limit=0` are both meaningful, and
 * silently dropping them would make them impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render a boolean query parameter the way Apify reads one.
 *
 * The vendor documents every boolean as "if `true` or `1`", and says nothing
 * about how a *false* value is parsed. Sending `?desc=false` therefore relies
 * on undocumented behaviour, so a `false` is expressed as absence instead —
 * which is what the documented default already is for every boolean in this
 * app's surface.
 */
export function flag(v: boolean | undefined): string | undefined {
  return v === true ? "1" : undefined;
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

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Normalise a `multiselect` param into a comma-joinable list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied resource id.
 *
 * Apify lets you address most resources three ways: by id (`iKkPcIgVvwmztduf8`),
 * by `username~resource-name`, or by `~resource-name` for the token owner's own.
 * The tilde is a legal path character, so it must survive escaping —
 * `encodeURIComponent` leaves `~` alone, which is exactly the behaviour needed,
 * while still neutralising a `/` or `?` someone pastes into an id field.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * The response fields that carry live secrets, and are therefore deleted before
 * an Action returns.
 *
 * This is not tidiness. Each of these is a working credential that the vendor
 * returns inside an otherwise ordinary read:
 *
 *  - `proxy.password` on `GET /v2/users/me` is the account's **Apify Proxy
 *    password**, which is the whole credential for `proxy.apify.com`. Anyone
 *    holding it can spend the account's proxy quota.
 *  - `urlSigningSecretKey` on a dataset or key-value store is the HMAC key that
 *    mints signed public URLs for that storage. Anyone holding it can hand out
 *    readable links to private data.
 *
 * A workflow step's result is persisted in the run record and is routinely
 * echoed into logs, other apps and human-readable previews, so returning either
 * of these would turn one read into a durable credential leak. They are dropped
 * rather than masked: a masked placeholder in a field named `password` reads
 * like a value, and something downstream will try to use it.
 *
 * The values remain available to their owner in the Apify Console. Nothing else
 * about the response is altered.
 */
export const REDACTED_FIELDS = ["proxy.password", "urlSigningSecretKey"] as const;

/**
 * Remove {@link REDACTED_FIELDS} from an entity, returning a shallow copy.
 *
 * Deliberately narrow: it walks only the exact documented paths above rather
 * than scrubbing anything that *looks* secret, because a heuristic that eats a
 * user's own field named `token` would corrupt scraped data — which is the
 * whole payload of this app.
 */
export function stripSecrets<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out.urlSigningSecretKey;
  const proxy = out.proxy;
  if (proxy && typeof proxy === "object" && !Array.isArray(proxy)) {
    const copy: Record<string, unknown> = { ...(proxy as Record<string, unknown>) };
    delete copy.password;
    out.proxy = copy;
  }
  return out as T;
}

/**
 * Is a content type one whose bytes survive a round trip through a JS string?
 *
 * A key-value store record is served under whatever content type it was written
 * with, and a run's `OUTPUT` record is very often an image or a zip. Decoding
 * those as text silently corrupts them — the replacement character is lossy and
 * irreversible — so the record actions detect the case and say so instead of
 * returning mangled bytes that look like data.
 *
 * The `+json` / `+xml` suffixes are RFC 6839 structured syntax suffixes
 * (`application/vnd.api+json`), which are textual despite not starting with
 * `text/`.
 */
export function isTextualContentType(contentType: string): boolean {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (!type) return false;
  if (type.startsWith("text/")) return true;
  if (type.endsWith("+json") || type.endsWith("+xml")) return true;
  return [
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-ndjson",
    "application/jsonl",
    "application/x-www-form-urlencoded",
    "application/yaml",
    "application/x-yaml",
  ].includes(type);
}

/** Does this content type carry JSON? */
export function isJsonContentType(contentType: string): boolean {
  const type = contentType.split(";")[0].trim().toLowerCase();
  return type === "application/json" || type.endsWith("+json");
}

/**
 * Turn Apify's error body into one actionable line.
 *
 * The `type` code is kept because it is what the vendor's own troubleshooting
 * is written against: `token-not-provided` (no credential reached the API),
 * `user-or-token-not-found` (the token is wrong or revoked) and
 * `insufficient-permissions` (the token is fine but scoped away from this
 * resource) are three different problems with three different fixes, and all
 * three arrive as a bare 401/403 without it.
 *
 * The message can carry only Apify's own prose and the caller's own input; the
 * credential never enters this module.
 */
export function formatApifyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ApifyErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ApifyErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Apify ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Apify ${status} ${err.type ?? "error"} for ${method} ${path}`,
    err.message,
    status === 429
      ? "Apify rate-limits per resource (60 requests/second by default); retry with exponential backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class ApifyClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": …}` in, `data` out. The shape of most endpoints. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /**
   * Parse the body without unwrapping.
   *
   * Used by the dataset-items endpoints, which answer a bare array — passing
   * those through {@link ApifyClient.data} would return the array unchanged
   * only by accident, and would break the day Apify adds a `data` key.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * The body verbatim, with the content type the vendor served it under.
   *
   * Key-value-store records and run logs are not JSON, and guessing that they
   * are is how a plain-text log turns into a parse error.
   */
  async raw(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ status: number; contentType: string; text: string }> {
    const res = await this.send(path, options);
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      text: res.status === 204 ? "" : await res.text(),
    };
  }

  /** Status only, for endpoints that answer 204 with no body (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Apify's multi-valued query parameters (`status`, `fields`, `omit`,
      // `unwind`, `flatten`) are documented as ONE comma-separated value, not
      // as a repeated key.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.rawBody) {
      headers["content-type"] = options.rawBody.contentType;
      init.body = options.rawBody.text;
    } else if (options.body !== undefined) {
      // The vendor's own note: "For requests with a JSON body, you must include
      // the Content-Type: application/json header."
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatApifyError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
