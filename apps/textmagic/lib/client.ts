import type { HookContext } from "@w6w/types";

/**
 * TextMagic REST API v2 client.
 *
 * Everything in this module was verified on 2026-09-05 against TextMagic's own
 * machine-readable OpenAPI (Swagger 2.0) document
 * (`docs.textmagic.com/swagger.json`, 2,310,913 bytes, `info.version` `"2"`,
 * `host` `rest.textmagic.com`) plus live probes against that host. Nothing came
 * from a third-party integration directory.
 *
 * ## One host, one prefix, one auth scheme
 *
 * The document declares no `basePath`; every path already carries the literal
 * `/api/v2` prefix. `securityDefinitions` declares exactly one scheme,
 * `BasicAuth` (HTTP Basic), applied by default to all 139 paths — see
 * `auth/basic.ts`. The "Getting started" section also documents a
 * `X-TM-Username` / `X-TM-Key` header pair as an alternative to Basic auth, but
 * that pair appears nowhere in the formal `securityDefinitions` or in any
 * per-operation `security` override, so this app uses Basic, the scheme the
 * spec itself declares.
 *
 * ## Response shapes
 *
 * Unlike some REST APIs in this pack, TextMagic does **not** wrap single
 * resources in an envelope — `GET /messages/{id}` returns the message object
 * directly. List endpoints return a flat `{page, pageCount, limit, resources}`
 * page object (see {@link TmPage}) — no `total` count, only a page count, so
 * "are there more pages" is `page < pageCount`.
 *
 * Errors are always `{"code": <int>, "message": "...", "errors"?: {...}}` with
 * a matching 4xx/5xx status. `errors` (present on a 400 whose `message` is
 * literally `"Validation Failed"`) groups field-level problems by parameter
 * name and is folded into the formatted message when present.
 *
 * ## A restriction and two limits, not documented as response headers
 *
 * TextMagic's own "Restrictions and Limits" section (`docs.textmagic.com`)
 * states these as prose, not as headers or a queryable endpoint:
 *
 *  - Phone numbers must be **E.164** (`447860021130`, no leading `+` in most
 *    examples though `+447860021130` is also accepted) — no local formats.
 *  - The `limit` query parameter on any list endpoint is clamped to `1..100`;
 *    an out-of-range value is silently replaced with the default of `10`, not
 *    rejected.
 *  - The account may not exceed **50 requests/second** — a `429 Too Many
 *    Requests` follows — and four specific write endpoints (`DELETE
 *    /contacts/blocked`, `PUT /contacts/{id}`, `PUT` and `POST
 *    /lists/{id}/contacts`) are capped tighter, at **5 requests/second**. No
 *    response header exposes remaining headroom against either ceiling, which
 *    is why `health/request-rate.ts` declares this dimension unavailable
 *    rather than guessing at it.
 */

/** The one and only API origin, with the fixed `/api/v2` prefix already applied. */
export const API_BASE = "https://rest.textmagic.com/api/v2";

/** The bare host, for `network.allow` and health-check `network.allow` entries. */
export const API_HOST = "rest.textmagic.com";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** TextMagic's flat list-page shape: no `total`, just a page count. */
export interface TmPage<T> {
  page: number;
  pageCount: number;
  limit: number;
  resources: T[];
}

interface TmErrorBody {
  code?: number;
  message?: string;
  errors?: Record<string, string[] | string>;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — a caller may
 * legitimately want `favorited=false` or `limit=0` sent explicitly, and
 * silently dropping them would make that inexpressible.
 */
export function compact(obj: Record<string, QueryValue>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn TextMagic's error body into one actionable line.
 *
 * `errors` (field -> message[]) is only present when `message` is the generic
 * `"Validation Failed"`, so it is folded in when available rather than
 * dropped — the generic message alone names no field.
 */
export function formatTextMagicError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TmErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TmErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (parsed.code === undefined && parsed.message === undefined)) {
    return `TextMagic ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const fieldErrors = parsed.errors
    ? Object.entries(parsed.errors)
      .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(", ") : msg}`)
      .join("; ")
    : undefined;

  const parts = [
    `TextMagic ${status} for ${method} ${path}`,
    parsed.message,
    fieldErrors,
    status === 429
      ? "TextMagic allows 50 requests/second (5/second on a few write endpoints); retry with backoff"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "));
}

export class TextMagicClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON body. Used for both single resources and `TmPage<T>` pages. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints that answer 204 with no body (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
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
      throw new Error(
        formatTextMagicError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
