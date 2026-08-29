import type { HookContext } from "@w6w/types";

/**
 * Pushbullet API v2 client (`api.pushbullet.com`).
 *
 * Everything in this module was verified on 2026-08-29 against Pushbullet's own
 * published API reference (`docs.pushbullet.com`, fetched live, 414,076 bytes)
 * plus its embedded request/response examples. Nothing here came from a
 * third-party integration directory.
 *
 * ## One host, one prefix, no envelope
 *
 * Every documented call is `https://api.pushbullet.com/v2/...`. Unlike Apify's
 * `{"data": …}` wrapper, Pushbullet list endpoints answer a **named** array —
 * `{"pushes": [...]}`, `{"devices": [...]}`, `{"chats": [...]}`,
 * `{"subscriptions": [...]}` — and single-object endpoints (create/update)
 * answer the object itself with no wrapper at all. There is nothing generic to
 * unwrap, so each action reads the key it expects.
 *
 * ## Errors
 *
 * A non-200 response carries `{"error": {"type", "message", "param"?, "cat"?}}`.
 * `type` is one of exactly two documented values — `invalid_request` (client
 * error) or `server` (Pushbullet's own fault) — which is far coarser than
 * Apify's per-condition codes, so {@link formatPushbulletError} leans on the
 * HTTP status and `message` rather than `type` to say anything useful. `cat` is
 * a decorative ASCII cat the vendor's docs promise on every error body
 * (`"~(=^‥^)"` in their own example) and is dropped here — cosmetic, never
 * actionable, and not worth carrying across the sandbox boundary.
 *
 * Per the vendor's own note: "Errors from intermediate servers or the hosting
 * infrastructure may not [carry that body]", so a non-JSON error body is
 * expected and handled, not a bug.
 *
 * ## Deleted objects
 *
 * A `DELETE` response is `{}` with no body worth parsing. A *listed* deleted
 * object (visible when syncing with `modified_after`) instead carries
 * `active: false` and **only** `iden`, `created`, `modified`, `active` — every
 * other property is stripped by the vendor, not by this client.
 *
 * ## Rate limits are genuinely readable — unlike most vendors in this pack
 *
 * Every response carries `X-Ratelimit-Limit`, `X-Ratelimit-Remaining` and
 * `X-Ratelimit-Reset` (unix seconds). That is a real, live headroom signal —
 * see `health/rate-limit.ts` — which is the opposite of Apify's per-resource
 * ceiling-only headers. The separate, vendor-stated "500 pushes/month on a free
 * account" ceiling is NOT exposed by any header or endpoint; see
 * `health/push-limit.ts` for why that one is declared unavailable instead.
 */

export const API_BASE = "https://api.pushbullet.com";
export const API_PREFIX = "/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface PushbulletErrorBody {
  error?: { type?: string; message?: string; param?: string };
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Accept a `json`-typed param as either a parsed value or the string a user typed.
 * The host hands a `json` param through in whichever shape it arrived in.
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

/** Keep an error message readable — a validation body can ramble. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Pushbullet's error body into one actionable line.
 *
 * `type` is kept only as a coarse hint (`invalid_request` vs `server`) because
 * the vendor documents nothing finer — everything specific is in `message`,
 * which is why this leans on the HTTP status for structure and `message` for
 * detail, rather than switching on `type` the way `lib/client.ts` in Apify or
 * Ashby can.
 */
export function formatPushbulletError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: PushbulletErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PushbulletErrorBody;
  } catch { /* not JSON — the vendor warns intermediate servers may not send one */ }

  const err = parsed?.error;
  if (!err) return `Pushbullet ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Pushbullet ${status} ${err.type ?? "error"} for ${method} ${path}`,
    err.message,
    err.param ? `(param: ${err.param})` : undefined,
    status === 429 ? "rate-limited — see X-Ratelimit-Reset and back off until then" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class PushbulletClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body. Used for every call — nothing in this API answers non-JSON on success. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the `DELETE` calls whose body is just `{}`. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
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
        formatPushbulletError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
