import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.hubapi.com";

/**
 * HubSpot CRM v3 uses cursor pagination: responses carry `paging.next.after`
 * which is passed as `after` on the next request. When missing there are no
 * more pages. Legacy endpoints use different keys (kept out — we standardize
 * on `/crm/v3/` everywhere).
 */
export interface HubSpotPaging {
  next?: { after?: string; link?: string };
  prev?: { before?: string; link?: string };
}

export interface HubSpotListResponse<T = unknown> {
  results: T[];
  paging?: HubSpotPaging;
  total?: number;
}

/**
 * A HubSpot CRM object as it comes back from the v3 objects API.
 * `properties` is a flat key→string map; `associations` is object-typed.
 */
export interface HubSpotObject {
  id: string;
  properties: Record<string, string | null>;
  propertiesWithHistory?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
  associations?: Record<string, { results: Array<{ id: string; type: string }> }>;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected by the auth `sign`
 * hook, not here — for API-key auth the runtime appends `hapikey` as a query
 * param via the `apiKey` config on the auth definition.
 */
export class HubSpotClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          for (const entry of v) url.searchParams.append(k, String(entry));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `HubSpot ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Turn a `{ key: value }` map into HubSpot's `{ properties: { key: value } }`
 * shape used by every v3 create/update endpoint. `undefined`/`null` entries
 * are dropped so callers can spread optional inputs without conditionals.
 */
export function toProperties(
  input: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}
