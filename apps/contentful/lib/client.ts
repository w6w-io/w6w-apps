import type { HookContext } from "@w6w/types";

/**
 * Contentful exposes three separate APIs on distinct hostnames — each with the
 * same URL scheme (`/spaces/{spaceId}/environments/{env}/...`) but different
 * capabilities:
 *
 *   - CDN (`cdn.contentful.com`)      — read published content. GET-only.
 *   - Preview (`preview.contentful.com`) — same shape, returns drafts. GET-only.
 *   - Management (`api.contentful.com`)  — full CRUD.
 *
 * Read actions accept a `source` param (delivery|preview) and pick between the
 * first two; write actions always go to Management. The client keeps the base
 * URL as a per-request concern so a single instance can hit whichever API each
 * action needs.
 */
export const API_HOSTS = {
  delivery: "https://cdn.contentful.com",
  preview: "https://preview.contentful.com",
  management: "https://api.contentful.com",
} as const;

export type ApiBase = keyof typeof API_HOSTS;

export interface ContentfulListResponse<T = unknown> {
  sys?: { type: "Array" };
  total: number;
  skip: number;
  limit: number;
  items: T[];
  includes?: Record<string, unknown[]>;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Which API to hit. Defaults to `delivery`. */
  base?: ApiBase;
  /**
   * Extra headers to merge in. The runtime's `sign` hook still injects auth —
   * these are for content-type overrides (e.g. Management API needs
   * `X-Contentful-Content-Type` for entry create).
   */
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Note we never set Authorization here — the
 * runtime routes the request through the auth `sign` hook, which injects it.
 */
export class ContentfulClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const base = API_HOSTS[options.base ?? "delivery"];
    const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      if (!headers["content-type"]) headers["content-type"] = "application/vnd.contentful.management.v1+json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Contentful ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Resolve `spaceId` and `environmentId` for an action. Params take precedence
 * so an action can target a different environment ad-hoc; otherwise we fall
 * back to whatever `afterConnect` recorded on the Connection display.
 */
export function resolveScope(
  input: { spaceId?: string; environmentId?: string },
  ctx: HookContext,
): { spaceId: string; environmentId: string } {
  const display = ctx.connection?.display as
    | { space?: { id?: string }; environment?: { id?: string } }
    | undefined;
  const spaceId = input.spaceId ?? display?.space?.id;
  const environmentId = input.environmentId ?? display?.environment?.id ?? "master";
  if (!spaceId) {
    throw new Error(
      "Contentful: missing `spaceId` — pass it as an action param or set it on the connection.",
    );
  }
  return { spaceId, environmentId };
}

/**
 * n8n's Contentful node exposes a handful of "additional fields" that map onto
 * Contentful's search query params — `equal`, `notEqual`, `include`, `exclude`
 * were named ergonomically but each carries the *full* `attribute=value` (or
 * `attribute[op]=value`) string. We keep the same author-facing UX and unpack
 * them here so the client speaks straight Contentful.
 */
export function applySearchExtras(
  qs: Record<string, string | number | boolean | undefined | null>,
  extras: {
    equal?: string;
    notEqual?: string;
    include?: string;
    exclude?: string;
    exist?: string;
    select?: string;
    order?: string;
    query?: string;
    content_type?: string;
  } | undefined,
): Record<string, string | number | boolean | undefined | null> {
  if (!extras) return qs;

  for (const key of ["equal", "notEqual", "include", "exclude"] as const) {
    const raw = extras[key];
    if (!raw) continue;
    const eq = raw.indexOf("=");
    if (eq <= 0) continue;
    const attr = raw.slice(0, eq);
    const value = raw.slice(eq + 1);
    if (attr) qs[attr] = value;
  }

  if (extras.exist) {
    const eq = extras.exist.indexOf("=");
    if (eq > 0) qs[extras.exist.slice(0, eq)] = extras.exist.slice(eq + 1);
  }
  if (extras.select) qs.select = extras.select;
  if (extras.order) qs.order = extras.order;
  if (extras.query) qs.query = extras.query;
  if (extras.content_type) qs.content_type = extras.content_type;
  return qs;
}
