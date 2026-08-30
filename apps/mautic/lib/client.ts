import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Mautic's REST API — verified against `devdocs.mautic.org/en/7.1/rest_api/*`
 * (getting_started.html, contacts.html, segments.html, companies.html,
 * campaigns.html, emails.html, tags.html, users.html; fetched 2026-08-30).
 * The base API endpoint the docs give is `https://mautic.example.com/api`.
 *
 * **There is no vendor host.** Mautic is self-hosted open-source software —
 * some organisations buy a hosted edition from a partner, but there is no
 * single fixed `api.mautic.*` host the way there is for a SaaS vendor. So the
 * base URL is a connection field and the egress allowlist is `["*"]`, the
 * posture this pack already uses for `gitea`, `mattermost`, `ghost`, `grafana`
 * and `jenkins`. It is deliberately wide, and it is the price of an app whose
 * server address only the operator knows.
 *
 * **The REST API is off by default.** An operator must turn it on under
 * Configuration → API Settings (or `'api_enabled' => 1` in `config/local.php`)
 * before any of these actions can reach anything.
 */
export const API_PATH = "/api";

/** Public (redacted-safe) connection metadata. */
export interface MauticConnectionDisplay {
  /** The instance origin, e.g. `https://mautic.example.com`. */
  baseUrl?: string;
  /** The username of the account the client credential was minted for. */
  username?: string;
  email?: string;
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * People paste `mautic.example.com`, `https://mautic.example.com/`, and —
 * because Mautic's own docs write every example as
 * `https://mautic.example.com/api` — a URL that already ends in `/api`. Both
 * `/api` and a trailing `/oauth/v2/...` are stripped so a pasted example URL
 * does not silently become `…/api/api/contacts`.
 *
 * A missing scheme defaults to `https`: a client secret in flight deserves
 * TLS, and producing `http://` from a bare hostname would silently downgrade
 * the credential's transport. An operator on a private network can still type
 * `http://` explicitly.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Mautic URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Mautic URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Mautic URL has no host: ${trimmed}`);
  let path = url.pathname.replace(/\/+$/, "");
  path = path.replace(/\/(api|oauth(\/v2)?(\/(authorize|token))?)$/i, "");
  return `${url.protocol}//${url.host}${path}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MauticConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Mautic connection records no instance URL — reconnect it so the URL can be stored",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so an edit does not overwrite untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Mautic's two documented error envelopes (`getting_started.html` §"Error
 * handling"): an OAuth failure is `{"error": "invalid_grant", "error_description": "…"}`;
 * every other failure is `{"error": {"message": "…", "code": 403}}`. Both are
 * folded into one readable string, and the raw body is returned verbatim if
 * neither shape matches — a system error that changes shape should not throw
 * "undefined".
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as {
      error?: string | { message?: string; code?: number };
      error_description?: string;
    };
    if (typeof body.error === "string") {
      return body.error_description ? `${body.error}: ${body.error_description}` : body.error;
    }
    if (body.error?.message) {
      return body.error.code ? `${body.error.message} (${body.error.code})` : body.error.message;
    }
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class MauticClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `Mautic ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * List endpoints wrap their collection in an envelope keyed by `total` plus a
   * resource-named key — but that key does **not** always match the resource:
   * `GET /segments` answers `{"total", "lists": {...}}`, not `"segments"`.
   * Every caller states its own `collectionKey` for exactly this reason.
   *
   * The collection itself is a map keyed by id for every resource except Tags,
   * which is a bare array — both shapes are normalised to an array here.
   *
   * Paging is offset-based (`start`/`limit`), not page-based: `start` advances
   * by however many rows the *previous* page actually returned, which is also
   * how a short page is recognised as the end of the collection.
   */
  async requestAll<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let start = 0;
    while (items.length < wantTotal) {
      const limit = Math.min(100, Math.max(1, wantTotal - items.length));
      const chunk = await this.request<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, start, limit },
      });
      const collection = chunk?.[collectionKey];
      const rows = Array.isArray(collection)
        ? collection
        : collection && typeof collection === "object"
        ? Object.values(collection as Record<string, unknown>)
        : [];
      items.push(...(rows as T[]));
      if (rows.length < limit) break;
      start += rows.length;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
