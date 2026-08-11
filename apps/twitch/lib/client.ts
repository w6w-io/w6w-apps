import type { HookContext } from "@w6w/types";

/**
 * Twitch Helix REST client.
 *
 * Every path, verb, query parameter and response field this module and the
 * actions above it depend on was read on 2026-08-11 from Twitch's own API
 * reference (dev.twitch.tv/docs/api/reference/, one 1,414,793-byte page holding
 * all 149 documented endpoints) and confirmed against live probes of
 * `api.twitch.tv`. Nothing came from a third-party integration directory.
 *
 * ## One host, one prefix
 *
 * Helix is served from exactly one origin, `api.twitch.tv`, and every endpoint
 * carries the `/helix` prefix. There is no regional host and no sandbox: a test
 * broadcaster is an ordinary account, and Twitch's local mock API is a separate
 * binary that is not part of this app's surface. So nothing about the host is
 * derived from the credential, and no action accepts one.
 *
 * ## Two headers, not one — and they must agree
 *
 * A Helix request needs BOTH `Authorization: Bearer <token>` AND `Client-Id:
 * <client id>`, and the client id must be the one the token was minted for.
 * The reference states the failure in the 401 row of nearly every endpoint:
 * "The ID in the Client-Id header must match the client ID in the access
 * token." Both headers are stamped by the `sign` hook, which is the only code
 * given the credential; nothing in this module or in `actions/` touches either.
 *
 * ## Repeated keys, never comma-joined
 *
 * Twitch's multi-valued query parameters repeat the key: `id=1234&id=5678`,
 * `login=foo&login=bar`, `user_id=1&user_id=2`. This is the opposite of most
 * APIs in this pack (Apify comma-joins, Google uses `fields`), and comma-joining
 * a Twitch list does not error — it silently looks up one nonexistent id named
 * `"1234,5678"` and returns an empty `data` array. {@link TwitchClient.get}
 * therefore appends one entry per value and never joins.
 *
 * ## Envelope and pagination
 *
 * Successful list reads answer `{"data": [...], "pagination": {"cursor": "..."}}`.
 * `pagination` is `{}` — not absent, and not `null` — at the end of the list, so
 * "is there another page" is `!!pagination?.cursor`, never `"pagination" in body`.
 * Writes answer either `{"data": [...]}` (Create Clip, Create Stream Marker) or
 * `204 No Content` with no body at all (Modify Channel Information, Send Chat
 * Announcement).
 *
 * ## Errors
 *
 * Helix failures are `{"error": "Unauthorized", "status": 401, "message": "..."}`.
 * Measured live on 2026-08-11: no credential gives
 * `{"error":"Unauthorized","status":401,"message":"OAuth token is missing"}`,
 * and a syntactically plausible but fake bearer + client id gives
 * `..."message":"Invalid OAuth token"`. The `message` is the actionable half and
 * is surfaced verbatim by {@link formatTwitchError}, because "OAuth token is
 * missing", "Invalid OAuth token" and "Client-Id header is missing" are three
 * different problems that arrive as the same bare 401 without it.
 *
 * Note that `id.twitch.tv` — the authorization service that `auth/` talks to —
 * uses a DIFFERENT error shape, `{"status": 401, "message": "..."}` with no
 * `error` key. That is handled in `auth/shared.ts`, not here.
 *
 * ## Rate limits
 *
 * A token bucket per client id, refilled every minute, with a separate bucket
 * for app-token requests and one per user for user-token requests. Responses
 * carry `Ratelimit-Limit`, `Ratelimit-Remaining` and `Ratelimit-Reset` (a Unix
 * epoch second). See `health/quota.ts` — and note the headers appear only on
 * responses Twitch actually bucketed, so an unauthenticated 401 carries none.
 */

/** The one and only Helix origin. */
export const API_BASE = "https://api.twitch.tv";

/** Every documented Helix path carries this prefix. */
export const API_PREFIX = "/helix";

/** A query value: a scalar, or a list that must be sent as repeated keys. */
export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Twitch's cursor envelope. `{}` — not absent — marks the end of the list. */
export interface TwitchPagination {
  cursor?: string;
}

/** The shape every list read answers with. */
export interface TwitchPage<T> {
  data: T[];
  pagination?: TwitchPagination;
  /** Only `GET /helix/channels/followers` and the follow reads carry this. */
  total?: number;
}

interface TwitchErrorBody {
  error?: string;
  status?: number;
  message?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `live_only=false` and `first=0`… well, `first` has a
 * documented minimum of 1, but `live_only=false` is a meaningful narrowing on
 * Search Channels (it is also the documented default, so it changes nothing —
 * but silently dropping it would make the explicit form impossible to express).
 */
export function compact(query: Record<string, QueryValue>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Normalise a list-ish param into the array Twitch wants as repeated keys.
 *
 * The host hands a `multiselect` through as an array and a `string` through as
 * whatever the user typed, so both are accepted here rather than at 15 call
 * sites. A comma- or whitespace-separated string is split, because that is what
 * a user pasting a list of ids will type, and sending it unsplit is the exact
 * silent-empty-result failure documented at the top of this file.
 */
export function toList(value: string[] | string | undefined | null): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parts = (Array.isArray(value) ? value : String(value).split(/[,\s]+/))
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
}

/**
 * Render a boolean the way Twitch's query parser reads one.
 *
 * The reference spells every boolean query parameter as the literal `true` or
 * `false`, so both are sent explicitly — unlike vendors that document only the
 * truthy form and leave `false` to undocumented behaviour.
 */
export function flag(value: boolean | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value ? "true" : "false";
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a Helix error body into one actionable line.
 *
 * `message` is kept verbatim because it is the only part that distinguishes the
 * failures a bare status code flattens together. Twitch's own 401 row lists
 * three distinct causes for the same code, and the client-id mismatch — the one
 * that catches every newcomer to this API — is only ever visible in `message`.
 *
 * Nothing here can echo a credential: the credential never enters this module,
 * and the text is Twitch's own prose plus the caller's own path.
 */
export function formatTwitchError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TwitchErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TwitchErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const parts = [
    `Twitch ${status}${parsed?.error ? ` ${parsed.error}` : ""} for ${method} ${path}`,
  ];
  if (parsed?.message) parts.push(parsed.message);
  else if (!parsed && raw) parts.push(truncate(raw));

  if (status === 401) {
    parts.push(
      "a Helix 401 is one of three things: no token, an expired or revoked token, or a Client-Id " +
        "that does not match the client the token was minted for",
    );
  }
  if (status === 429) {
    parts.push(
      "Twitch rate-limits per client id per minute (per user as well, for user tokens); " +
        "retry after the Ratelimit-Reset epoch second on the response",
    );
  }
  return truncate(parts.join(": "), 1000);
}

export class TwitchClient {
  constructor(private ctx: HookContext) {}

  /** A list or object read. Returns the parsed body, envelope included. */
  async get<T = unknown>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    return await this.json<T>(path, { query });
  }

  /** A write that answers with a body (Create Clip → 202, Create Stream Marker → 200). */
  async send<T = unknown>(path: string, options: RequestOptions): Promise<T> {
    return await this.json<T>(path, options);
  }

  /**
   * A write that answers `204 No Content` (Modify Channel Information, Send
   * Chat Announcement). Returns the status so an action can report it rather
   * than inventing a body Twitch never sent.
   */
  async status(path: string, options: RequestOptions): Promise<number> {
    const res = await this.request(path, options);
    return res.status;
  }

  private async json<T>(path: string, options: RequestOptions): Promise<T> {
    const res = await this.request(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async request(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [key, value] of Object.entries(compact(options.query ?? {}))) {
      // Repeated keys, never comma-joined. See the module header.
      if (Array.isArray(value)) { for (const v of value) url.searchParams.append(key, String(v)); }
      else url.searchParams.append(key, String(value));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    // `ctx.fetch` only. The runtime routes this through the auth `sign` hook,
    // which is where the bearer token and the Client-Id header are added.
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatTwitchError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
