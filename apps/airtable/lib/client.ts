import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.airtable.com/v0";

/**
 * Airtable v0 uses cursor-style pagination on record listings: each response
 * includes an `offset` string. Callers pass it back as `?offset=…` on the next
 * request to fetch the next page. Undefined `offset` means the end of the set.
 *
 * The base-listing endpoint (`/meta/bases`) uses the same cursor scheme.
 */
export interface AirtableListEnvelope<T = unknown> {
  records?: T[];
  bases?: T[];
  offset?: string;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. We never set Authorization here — the runtime
 * routes the request through the auth `sign` hook, which injects it. Airtable
 * accepts array-valued query params only with repeated `?fields[]=A&fields[]=B`
 * pairs (bracketed) — see `applyQuery`.
 */
export class AirtableClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}/${stripLeadingSlash(path)}`);
    if (options.query) applyQuery(url, options.query);

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
        `Airtable ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

function stripLeadingSlash(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

/**
 * Airtable's `fields` param has to be sent as bracketed repeats
 * (`fields%5B%5D=Name&fields%5B%5D=Email`). String values are set once. `null`
 * and `undefined` are skipped so callers can pass through optional params.
 */
function applyQuery(
  url: URL,
  query: Record<string, string | number | boolean | string[] | undefined | null>,
): void {
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(`${k}[]`, String(item));
    } else {
      url.searchParams.set(k, String(v));
    }
  }
}
