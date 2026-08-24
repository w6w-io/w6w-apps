import type { HookContext, Param } from "@w6w/types";

/**
 * Wealthbox API v1.
 *
 * ## The host is NOT a wealthbox.com subdomain
 *
 * dev.wealthbox.com's own "Introduction" states the API Endpoint verbatim as
 * `https://api.crmworkspace.com`, and every example request in the docs (auth,
 * pagination, every resource) targets that host with a `/v1` prefix — e.g.
 * `curl https://api.crmworkspace.com/v1/contacts -i -H "ACCESS_TOKEN:..."`.
 * The OAuth authorize/token endpoints live on a THIRD host, `app.crmworkspace.com`
 * (`https://app.crmworkspace.com/oauth/authorize`, `.../oauth/token`) — this app
 * ships the personal-access-token auth method only (see `auth/api-key.ts`), so
 * `app.crmworkspace.com` is never called and is deliberately not allowlisted.
 * `w6w.network.allow` lists only `api.crmworkspace.com`.
 */
export const API_BASE = "https://api.crmworkspace.com/v1";

/**
 * Wealthbox paginates every list endpoint with a page-based `page`/`per_page`
 * pair (default `page=1`, `per_page=25`), per dev.wealthbox.com's "Pagination"
 * section. There is no `has_more`/cursor in the response — the caller pages
 * forward until a page comes back with fewer than `per_page` items.
 */
export interface PageInput {
  page?: number;
  perPage?: number;
}

export function pageQuery(input: PageInput): Record<string, string | number | undefined> {
  return {
    page: input.page,
    per_page: input.perPage,
  };
}

export const PAGE_PARAMS: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    hint: "Page number (`page`). Wealthbox defaults to 1.",
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    hint: "Results per page (`per_page`). Wealthbox defaults to 25.",
  },
];

/** The `Param` every write action reuses to reach fields this app does not model directly. */
export const ADDITIONAL_PROPERTIES_PARAM: Param = {
  key: "additionalProperties",
  label: "Additional properties",
  type: "json",
  hint: "Object of Wealthbox request attribute names → values, merged into the request body. " +
    "Covers the many optional Contact/Task/Event/Opportunity fields this action does not " +
    "expose individually (see dev.wealthbox.com for the full list).",
};

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null | (string | number)[]>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Deliberately never sets an auth header: the runtime routes every request
 * through the Auth `sign` hook, which is the only code handed the raw
 * credential.
 */
export class WealthboxClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(`${k}[]`, String(item));
          continue;
        }
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        const parsed = JSON.parse(detail) as { errors?: unknown; error?: string };
        message = typeof parsed.errors === "string"
          ? parsed.errors
          : parsed.errors !== undefined
          ? JSON.stringify(parsed.errors)
          : parsed.error;
      } catch {
        // Non-JSON body; the status alone is the more honest message.
      }
      throw new Error(
        `Wealthbox ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${message ?? detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Drop keys whose value is `undefined` so a PUT never sends an explicit
 * `null`/blank for a field the caller simply did not mention.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
