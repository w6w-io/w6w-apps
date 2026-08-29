import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.salesloft.com/v2";

/**
 * Every Salesloft v2 response wraps its payload in a `data` key. List
 * ("index") endpoints add a `metadata.paging` block; single-record endpoints
 * (`show`, `create`, `update`) return `data` as a bare object. Confirmed
 * against the response-parsing convention exercised by both a live vendor
 * client (`node-salesloft`'s `Resource.list/fetch/create/update` all return
 * `results.data`) and the field-level shapes cross-checked against
 * developers.salesloft.com's own rendered docs pages (see README "API
 * verification" section) — the interactive request/response panels on
 * developers.salesloft.com are populated client-side and could not be
 * fetched headlessly from this environment, so the envelope shape itself
 * rests on that corroboration rather than a directly-observed JSON sample.
 */
export interface SalesloftPaging {
  per_page?: number;
  current_page?: number;
  next_page?: number | null;
  prev_page?: number | null;
  total_pages?: number;
  total_count?: number;
}

export interface SalesloftEnvelope<T = unknown> {
  data: T;
  metadata?: {
    paging?: SalesloftPaging;
    [k: string]: unknown;
  };
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets auth — the runtime routes the
 * request through the active auth method's `sign` hook, which sets the
 * `Authorization: Bearer <token>` header for both the API-key and OAuth2
 * methods (Salesloft signs both the same way; only the token's provenance
 * differs).
 */
export class SalesloftClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<SalesloftEnvelope<T>> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (res.status === 204) return { data: undefined as T };

    const text = await res.text().catch(() => "");
    let parsed: SalesloftEnvelope<T> | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as SalesloftEnvelope<T>;
      } catch { /* non-JSON body handled below */ }
    }

    if (!res.ok) {
      const detail = (parsed as unknown as { error?: string; message?: string })?.error ??
        (parsed as unknown as { error?: string; message?: string })?.message ?? text;
      throw new Error(
        `Salesloft ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }

    return parsed ?? ({ data: undefined as T });
  }
}

/**
 * Drop `undefined`/`null`/`""` entries so an action can spread its optional
 * inputs without a conditional per field, without accidentally sending an
 * explicit `null` (which several Salesloft fields — e.g. `custom_fields` —
 * would otherwise interpret as "clear this value").
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(body) as Array<keyof T>) {
    const v = body[key];
    if (v === undefined || v === null || v === "") continue;
    out[key] = v;
  }
  return out;
}
