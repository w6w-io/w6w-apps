import type { HookContext } from "@w6w/types";

/**
 * Chatbase API v2 REST client (`www.chatbase.co/api/v2`), with a narrow v1
 * escape hatch for the one capability v2 does not (yet) cover: leads.
 *
 * Everything here was verified on 2026-08-29 against Chatbase's own OpenAPI
 * 3.1 document, fetched from `www.chatbase.co/docs/api-v2-merged-openapi.json`
 * (`info.version` `2.0.0`, 323,394 bytes), plus the prose pages under
 * `/docs/api-v2/*` and live probes against `www.chatbase.co`. Nothing here
 * came from a third-party integration directory.
 *
 * ## v1 exists, is live, and is NOT what this app is built on
 *
 * Chatbase publishes two REST surfaces at once: a legacy v1
 * (`www.chatbase.co/api/v1`, `chatbots`/`get-leads`/`get-conversations`/…) and
 * the current v2 covered here. Chatbase's own v1 docs point integrators at v2
 * ("Looking for API v2? … Check out the API v2 Reference"), and v2 is the only
 * surface with structured error codes, cursor pagination, and a helpdesk at
 * all — so every action in this app targets v2 **except** `lead-list`, which
 * reads v1's `/get-leads`. As of this writing v2 has no leads endpoint of any
 * kind, so that one capability has no v2 form to prefer. Both hosts are the
 * same hostname (`www.chatbase.co`), so one Connection and one
 * `network.allow` entry cover both.
 *
 * v2 requires a Chatbase **Standard Plan or above**; requests from an
 * unsupported plan are rejected with `SUBSCRIPTION_API_RESTRICTED_PLAN`. v1
 * carries no such restriction, which is presumably why Chatbase kept it live
 * rather than sunsetting it outright.
 *
 * ## Three response shapes, not one
 *
 * Unlike an API with one dominant envelope, v2 genuinely varies by endpoint —
 * confirmed by reading the schema of every response in the merged OpenAPI
 * document, not guessed from a sample:
 *
 *  - **Paginated lists** (agents, sources, conversations, messages, tickets,
 *    ticket search) answer `{"data": [...], "pagination": {cursor, hasMore,
 *    total?}}`. `{@link ChatbaseClient.request}` returns this whole envelope
 *    verbatim — the cursor is exactly what a workflow needs to page further.
 *  - **Single-resource reads and writes** (an Agent, a Source, a Ticket, a
 *    created ticket message) answer the **bare resource**, no envelope at
 *    all. So do the fire-and-forget actions (`{"success": true}` for train /
 *    delete / toggle-auto-retrain, `{"id", "pendingSteps"?}` for create /
 *    clone).
 *  - **Chat-shaped endpoints** (chat, retry, submit-tool-result,
 *    update-message-feedback) answer `{"data": {...}}` — a *single* object
 *    wrapped in the same key list responses use for an array. Getting this
 *    one wrong is the easiest way to hand a workflow step `{data: {...}}`
 *    instead of the message it asked for, so those four actions unwrap it
 *    explicitly with {@link ChatbaseClient.unwrap} rather than guessing a
 *    shared shape.
 *  - Two structures don't even use `data` as their array key:
 *    `ticket-statuses` and `teams` each answer a **bare array**, and the
 *    WhatsApp templates list answers `{"templates": [...], "complete",
 *    "unavailableWabaIds"}`.
 *
 * ## Errors
 *
 * v2 failures are `{"error": {"code", "message", "details"?}}` with a stable
 * machine `code` (`AUTH_INVALID_API_KEY`, `CHAT_CREDITS_EXHAUSTED`,
 * `SOURCE_LINK_LIMIT_EXCEEDED`, …) — see `/docs/api-v2/error-handling`. v1
 * failures are the older `{"message": string}` shape with no code at all.
 * {@link formatChatbaseError} handles both rather than assuming the newer one
 * everywhere, since `lead-list` is the one action still speaking v1.
 *
 * ## Rate limiting
 *
 * 100 requests per 10-second sliding window, scoped per API key *and* IP.
 * Every response — success or failure — carries `X-RateLimit-Limit`,
 * `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (Unix **milliseconds**,
 * not seconds); a 429 additionally carries `Retry-After` in seconds. See
 * `health/quota.ts`.
 */

/** The v2 surface every action but `lead-list` targets. */
export const API_BASE = "https://www.chatbase.co/api/v2";

/** The legacy surface. Used only by `lead-list` — see the module doc above. */
export const API_V1_BASE = "https://www.chatbase.co/api/v1";

/** Both hosts above resolve here; it is the only entry `network.allow` needs. */
export const HOST = "www.chatbase.co";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

interface V2ErrorBody {
  error?: { code?: string; message?: string; details?: Record<string, string> };
}

interface V1ErrorBody {
  message?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed —
 * the host hands a `json` param through in whichever shape it arrived.
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

/** Normalise a `multiselect`/comma-list param into a comma-joined query value. */
export function toCommaList(v: string[] | string | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items.join(",") : undefined;
}

/** Keep an error message readable — a validation body can carry a large `details` map. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a Chatbase error body into one actionable line, whichever API version
 * produced it.
 *
 * The v2 `code` is kept verbatim because it is what Chatbase's own error
 * table is written against — `AUTH_INVALID_API_KEY`, `CHAT_CREDITS_EXHAUSTED`
 * and `SUBSCRIPTION_API_RESTRICTED_PLAN` are three different problems with
 * three different fixes, and all three arrive as a bare 401/402/403 without
 * it. v1 carries no code, only a message, so that case is reported as-is.
 */
export function formatChatbaseError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch { /* not JSON — fall through to the raw body */ }

  const v2 = (parsed as V2ErrorBody | null)?.error;
  if (v2?.code || v2?.message) {
    const parts = [
      `Chatbase ${status} ${v2.code ?? "error"} for ${method} ${path}`,
      v2.message,
      v2.details ? `details: ${JSON.stringify(v2.details)}` : undefined,
      status === 429
        ? "rate limit is 100 requests/10s per API key + IP; check Retry-After"
        : undefined,
    ].filter(Boolean);
    return truncate(parts.join(": "), 1200);
  }

  const v1Message = (parsed as V1ErrorBody | null)?.message;
  if (v1Message) {
    return truncate(`Chatbase ${status} for ${method} ${path}: ${v1Message}`, 1200);
  }

  return truncate(`Chatbase ${status} for ${method} ${path}: ${raw}`, 1200);
}

/** Rate-limit headers Chatbase attaches to every v2 response — see `health/quota.ts`. */
export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  /** ISO 8601, converted from the vendor's Unix-milliseconds `X-RateLimit-Reset`. */
  resetAt?: string;
  /** Present only on a `429`. */
  retryAfterSeconds?: number;
}

export function readRateLimit(res: Response): RateLimitInfo {
  const num = (name: string): number | undefined => {
    const v = res.headers.get(name);
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const resetMs = num("x-ratelimit-reset");
  return {
    limit: num("x-ratelimit-limit"),
    remaining: num("x-ratelimit-remaining"),
    resetAt: resetMs !== undefined ? new Date(resetMs).toISOString() : undefined,
    retryAfterSeconds: num("retry-after"),
  };
}

export class ChatbaseClient {
  /** The rate-limit headers from the most recently completed request. */
  lastRateLimit?: RateLimitInfo;

  constructor(private ctx: HookContext, private base: string = API_BASE) {}

  /** Parse the JSON body without unwrapping — the shape most v2 endpoints use. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Unwrap `{"data": T}` — the shape the chat-family endpoints use (chat,
   * retry, submit-tool-result, update-message-feedback). See the module doc's
   * "Three response shapes" section for why this is a distinct method rather
   * than the default.
   */
  async unwrap<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<{ data?: T }>(path, options);
    return (body?.data ?? body) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    this.lastRateLimit = readRateLimit(res);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatChatbaseError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/** A v1 client, used only by `lead-list`. See the module doc's v1 section. */
export class ChatbaseV1Client extends ChatbaseClient {
  constructor(ctx: HookContext) {
    super(ctx, API_V1_BASE);
  }
}
