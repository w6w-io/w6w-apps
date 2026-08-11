import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Mattermost REST client (API v4).
 *
 * Verified on 2026-08-11 against Mattermost's own OpenAPI source
 * (`mattermost/mattermost-api-reference`, `v4/source/*.yaml` — the files
 * `api.mattermost.com` is generated from) plus live probes against
 * `community.mattermost.com`, running **server 11.11.0**.
 *
 * ## There is no vendor API host — the server IS the host
 *
 * Mattermost is open source and runs as Mattermost Cloud, as a self-hosted
 * Docker/omnibus install, and on-premise behind a corporate proxy. Its own
 * documentation writes every example against `http://localhost:8065` — i.e.
 * "wherever you put it".
 *
 * So, exactly as the sibling `metabase`, `baserow` and `discourse` apps do:
 * `network.allow` is `["*"]`, and the server URL is an **Auth field**, not an
 * Action param. A personal access token is issued by one server and is valid on
 * that server only, so the URL and the token are two halves of one Connection.
 * `afterConnect` republishes the URL on `connection.display.siteUrl` and this
 * module reads it from there, so the client can address the right host without
 * ever seeing a credential.
 *
 * ## Error bodies are structured, and worth keeping
 *
 * Every Mattermost error is a JSON object with a stable machine-readable `id`
 * (`api.context.session_expired.app_error`), a human `message`, a
 * `detailed_error`, a `request_id` and a `status_code`. Verified on the wire.
 * `formatMattermostError` surfaces the `id` and `message` rather than
 * flattening them into "HTTP 401", because the `id` is the part that tells you
 * whether the token expired, the user lacks permission, or the channel is gone.
 */

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface MattermostConnectionDisplay {
  /** Origin of the Mattermost server, normalised: no trailing slash, no `/api/v4`. */
  siteUrl?: string;
}

/**
 * Normalise a user-typed server URL into a bare origin.
 *
 * People paste all of `mattermost.example.com`, `https://mattermost.example.com/`,
 * `https://mattermost.example.com/api/v4` and a permalink to a message. All mean
 * the same server.
 *
 * The `/api/v4` strip is not cosmetic — Mattermost's own curl examples end in
 * `/api/v4/users/me`, so a pasted `…/api/v4` is entirely plausible, and silently
 * producing `/api/v4/api/v4/posts` would be a baffling 404.
 *
 * A missing scheme defaults to `https`: a token in flight deserves TLS, and
 * producing `http://` from a bare hostname would silently downgrade the
 * credential's transport. Operators running plaintext on a private network can
 * still type `http://` explicitly — which is why `http://localhost:8065`, the
 * vendor's own example, survives unchanged.
 */
export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Mattermost URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Mattermost URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Mattermost URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the server origin off the redacted Connection. Never touches the credential. */
export function siteUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MattermostConnectionDisplay;
  if (display.siteUrl) return normalizeSiteUrl(display.siteUrl);
  throw new Error(
    "Mattermost connection records no server URL — reconnect it so the URL can be stored.",
  );
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/**
 * Mattermost's post-list envelope, returned by every endpoint that lists posts.
 *
 * It is **not** a bare array: `order` carries the ids in display order and
 * `posts` is a map keyed by id. Iterating `Object.values(posts)` loses the
 * ordering, which is the single most common way to misread this API, so the
 * envelope is returned whole rather than flattened.
 */
export interface MattermostPostList {
  order: string[];
  posts: Record<string, Record<string, unknown>>;
  next_post_id?: string;
  prev_post_id?: string;
  has_next?: boolean;
}

interface MattermostErrorBody {
  id?: string;
  message?: string;
  detailed_error?: string;
  request_id?: string;
  status_code?: number;
}

/**
 * Drop keys the caller left unset.
 *
 * Mattermost's post patch applies exactly the keys present, so forwarding a
 * field the user never touched would blank a real value. `false` and `0`
 * survive — `is_pinned: false` is how a post is un-pinned.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a comma-separated or array param into a list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render Mattermost's error body as one actionable line.
 *
 * The `id` is the stable half — `api.context.session_expired.app_error`,
 * `api.context.permissions.app_error`, `store.sql_channel.get.existing.app_error`
 * — and is what distinguishes an expired token from a permission problem from a
 * missing channel. `request_id` is included because it is what a Mattermost
 * admin needs to find the call in the server log.
 */
export function formatMattermostError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: MattermostErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as MattermostErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.id && !parsed.message)) {
    return `Mattermost ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const parts = [
    `Mattermost ${status}${parsed.id ? ` ${parsed.id}` : ""} for ${method} ${path}`,
    parsed.message,
    parsed.request_id && `request_id ${parsed.request_id}`,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class MattermostClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = siteUrlFromConnection(ctx.connection);
  }

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
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
        formatMattermostError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
