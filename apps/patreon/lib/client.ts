import type { HookContext } from "@w6w/types";

/**
 * All API v2 requests go to `www.patreon.com` (not a separate `api.` host —
 * verified against docs.patreon.com's own sample cURL invocations, which all
 * target `https://www.patreon.com/api/oauth2/v2/...`).
 */
export const API_URL = "https://www.patreon.com/api/oauth2/v2";
export const PATREON_HOST = "www.patreon.com";

/**
 * Patreon's API v2 is JSON:API. Every response is `{ data, included?, meta?,
 * links? }`; `data` is a single resource object (`{ id, type, attributes,
 * relationships }`) or an array of them. Unlike a generic REST API, v2 returns
 * **no attributes or relationships by default** — every field must be
 * explicitly requested via `fields[<type>]=a,b,c` and every related resource
 * via `include=a,b`. Callers of this client pass those as ordinary query
 * params (already bracketed, e.g. `"fields[campaign]"`); `URLSearchParams`
 * percent-encodes the brackets for us.
 */
export interface JsonApiResource<A = Record<string, unknown>> {
  id: string;
  type: string;
  attributes?: A;
  relationships?: Record<string, unknown>;
}

export interface JsonApiPagination {
  total?: number;
  cursors?: { next?: string | null };
}

export interface JsonApiEnvelope<T> {
  data: T;
  included?: JsonApiResource[];
  meta?: { pagination?: JsonApiPagination };
  links?: Record<string, string | null>;
}

export interface JsonApiError {
  id?: string;
  status?: string;
  code?: string | number | null;
  code_name?: string;
  title?: string;
  detail?: string;
  retry_after_seconds?: number;
}

export interface RequestOptions {
  method?: string;
  /** Query params, already JSON:API-shaped (e.g. `"fields[member]"`, `"include"`, `"page[count]"`). */
  query?: Record<string, string | number | undefined | null>;
  /** Sent verbatim as `{ "data": body }`, per the JSON:API request shape Patreon documents. */
  body?: Record<string, unknown>;
}

/** Thrown for any non-2xx response, carrying the vendor's own error detail when present. */
export class PatreonApiError extends Error {
  constructor(public status: number, public errors: JsonApiError[], detail: string) {
    super(`Patreon API error ${status}: ${detail}`);
    this.name = "PatreonApiError";
  }
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which injects it.
 */
export class PatreonClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = (options.method ?? "GET").toUpperCase();
    const init: RequestInit = { method, headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify({ data: options.body });
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    if (!res.ok) {
      const errors = (json as { errors?: JsonApiError[] } | undefined)?.errors ?? [];
      const first = errors[0];
      const detail = first?.detail ?? first?.title ?? res.statusText ?? `HTTP ${res.status}`;
      throw new PatreonApiError(res.status, errors, detail);
    }

    return json as T;
  }
}
