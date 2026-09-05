import type { HookContext } from "@w6w/types";

/**
 * Tumblr API v2 REST client.
 *
 * Everything in this module was verified on 2026-09-05 against Tumblr's own
 * hand-written API reference (`https://www.tumblr.com/docs/en/api/v2`,
 * ~324 KB HTML — Tumblr publishes prose documentation, not an OpenAPI
 * document) plus live probes against `api.tumblr.com`. Nothing came from a
 * third-party integration directory.
 *
 * ## One host
 *
 * Every documented request starts with `https://api.tumblr.com`, and every
 * path carries the `/v2` prefix (the doc's own "URI Structure" section). There
 * is no regional host and nothing about it is derived from the credential.
 *
 * ## The envelope, and why this client does not unwrap it uniformly
 *
 * Every response — success or error — is `{"meta": {"status", "msg"},
 * "response": …}`. Unlike some REST APIs, `response`'s own shape is NOT
 * uniform: it is an object whose key names differ per endpoint (`{blog: …}`,
 * `{liked_posts: […], liked_count}`, `{users: […], total_users}`, `{posts:
 * […], total_posts}`, …), and for the one endpoint this app deliberately does
 * NOT implement (`/tagged`) the vendor's own docs omit the "Response" section
 * entirely — every other endpoint on the page has one. Rather than guess a
 * shape not stated by the vendor, `tagged-posts-search` (and any endpoint like
 * it) is simply left out — see the README.
 *
 * So this client exposes the bare `response` value ({@link TumblrClient.data})
 * and lets each action's own `output` documentation name the field it expects,
 * exactly as the vendor's docs do — rather than inventing a generic
 * `items`/`data` field that doesn't exist on the wire.
 *
 * ## Errors
 *
 * A failed request answers `{"meta": {"status", "msg"}, "errors": [{"code",
 * "detail", "title"?}], "response": []}`. `code` is the field to branch on:
 * **`detail`'s text is randomised for the generic/no-credential case** — a
 * live probe against `GET /v2/user/info` with no `Authorization` header
 * returned three DIFFERENT strings on three consecutive calls ("Hit a glitch.
 * Try again.", "Internet strangeness. Try again.", "Measly little error. Try
 * again."), all under the same `code: 0`. A garbage bearer token, by
 * contrast, consistently answers `code: 1013, "detail": "Unable to
 * authorize"`. So `formatTumblrError` and `auth/oauth2.ts`'s `test` hook
 * branch on `code`, never on `detail`'s wording.
 *
 * ## Rate limits
 *
 * 300 calls/minute and 18,000/hour per IP; 1,000/hour and 5,000/day per
 * consumer key (OAuth consumer key = this app's registered client). A
 * `429 Limit Exceeded` response states which limit was hit in its body/headers.
 * There are also separate per-feature daily ceilings (250 new posts, 200
 * follows, 1,000 likes, …) — see the vendor's own "Rate Limits" section.
 */

/** The one and only API origin. The doc's "URI Structure" section declares no other host. */
export const API_BASE = "https://api.tumblr.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface TumblrErrorEntry {
  code?: number;
  title?: string;
  detail?: string;
}

interface TumblrErrorBody {
  meta?: { status?: number; msg?: string };
  errors?: TumblrErrorEntry[];
}

interface TumblrEnvelope<T> {
  meta?: { status?: number; msg?: string };
  response?: T;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — both are
 * meaningful values. Generic so the result stays assignable to whatever
 * narrower record type the caller built it for (`Record<string, QueryValue>`
 * for a query object, an arbitrary body shape for a POST/PUT).
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied blog identifier or post id.
 *
 * Blog identifiers are a short name, a hostname (which may itself contain a
 * custom domain), or a `t:` UUID — all of them safe under ordinary percent
 * escaping. Escaping still matters: it stops a `/` or `?` pasted into an
 * identifier field from escaping the path segment it belongs in.
 */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host hands a `json` param through in whichever shape it arrived.
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

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Tumblr's error envelope into one actionable line.
 *
 * Keeps the numeric `code` (stable) and drops nothing from `detail` (kept
 * verbatim, even though its wording is randomised for `code: 0` — see the
 * module docstring) so the raw vendor text is still available to whoever
 * reads the thrown error, without this client pretending the wording means
 * anything on its own.
 */
export function formatTumblrError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TumblrErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TumblrErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const first = parsed?.errors?.[0];
  const msg = parsed?.meta?.msg;
  if (!first && !msg) return `Tumblr ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Tumblr ${status}${
      first?.code !== undefined ? ` (code ${first.code})` : ""
    } for ${method} ${path}`,
    msg,
    first?.detail,
    status === 429
      ? "Tumblr rate-limits per IP and per consumer key; retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class TumblrClient {
  constructor(private ctx: HookContext) {}

  /** Parse the envelope and return the bare `response` value — see the module docstring. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    const body = JSON.parse(text) as TumblrEnvelope<T>;
    return body.response as T;
  }

  /** Status only, for endpoints whose success body carries nothing worth returning. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Every documented multi-valued query parameter on this app's surface
      // (`tag`) is used with a single value; the array form
      // (`tag[0]=…&tag[1]=…`) is left unimplemented (see README).
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
        formatTumblrError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
