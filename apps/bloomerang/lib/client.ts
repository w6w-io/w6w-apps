import type { HookContext } from "@w6w/types";

/**
 * Bloomerang REST API v2.
 *
 * ## Base URL, and the `.co` / `.com` split
 *
 * Bloomerang's marketing and docs live at `bloomerang.com`, but the API host is
 * `api.bloomerang.co` — a **different** domain, not a subdomain of the docs
 * site. This is stated as the single `servers[0].url` entry
 * (`https://api.bloomerang.co/v2`) in Bloomerang's own OpenAPI document, served
 * from
 * <https://bloomerang-api-documentation.s3.us-west-2.amazonaws.com/public_crm_generated.json>
 * and embedded via Swagger UI on the current REST API docs page
 * (<https://bloomerang.com/api/rest-api/>). Verified live 2026-09-01: an
 * unauthenticated `GET https://api.bloomerang.co/v2/user/current` answers `401`
 * with a real Bloomerang error body (`{"Message":"Missing Authorization
 * Header","ErrorCode":110}`), not a generic gateway page — this is the real API
 * host, not a decoy.
 *
 * Only `api.bloomerang.co` is on this app's egress allowlist. The OAuth
 * authorization host (`crm.bloomerang.com`) is not called — this app ships the
 * private-key auth method only; see `auth/api-key.ts` for why.
 *
 * ## This is the CURRENT REST API — v1 is a deprecated, different host shape
 *
 * Bloomerang's docs site still serves a **v1** REST API reference
 * (`/api/rest-api-v1/`), explicitly marked "This version of the REST API is now
 * deprecated... If you are creating a new integration, use the current REST
 * API." v1 used a different base path (`https://api.bloomerang.com/v1/...`,
 * note `.com` not `.co`) and a different object model (e.g. `Constituent`
 * singular resources vs. this app's `/constituent` + `/constituents/search`
 * split). This app deliberately targets v2 only.
 *
 * ## Pagination
 *
 * Every list endpoint (`/constituents/search`, `/transactions`, `/funds`, …)
 * takes `skip` (default 0) and `take` (default 50, **max 50** — confirmed in
 * the OpenAPI schema's `maximum: 50` on every list endpoint's `take`
 * parameter) and returns the same envelope shape:
 *
 *   `{ Total, TotalFiltered, Start, ResultCount, Results: [...] }`
 *
 * `Total` is the count of every record in the database; `TotalFiltered` is how
 * many match this call's filters; `Results` is the page itself.
 */
export const API_URL = "https://api.bloomerang.co/v2";

/** The pagination envelope shared by every list endpoint. */
export interface BloomerangList<T = unknown> {
  Total: number;
  TotalFiltered: number;
  Start: number;
  ResultCount: number;
  Results: T[];
}

/** Query params shared by every list endpoint — `take` is capped at 50 by the API itself. */
export interface PageInput {
  skip?: number;
  take?: number;
}

export function pageQuery(input: PageInput): Record<string, string | number | undefined> {
  return { skip: input.skip, take: input.take };
}

/** The `Param[]` fragment every list action reuses. */
export const PAGE_PARAMS = [
  {
    key: "skip",
    label: "Skip",
    type: "number" as const,
    hint: "Number of records to skip before starting to collect the result set (`skip`).",
  },
  {
    key: "take",
    label: "Take",
    type: "number" as const,
    hint: "Number of records to return (`take`). Bloomerang defaults to 50 and caps this at 50.",
  },
];

/** The `output` fragment every list action reuses. */
export const PAGE_OUTPUT = [
  { key: "Total", type: "number" as const, label: "Total records in the database" },
  { key: "TotalFiltered", type: "number" as const, label: "Total records matching the filters" },
  { key: "Results", type: "array" as const, label: "Results for this page" },
];

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Bloomerang's error body, confirmed live on both a missing and an invalid key. */
interface BloomerangError {
  Message?: string;
  ErrorCode?: number;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Deliberately never sets an `Authorization` (or `X-API-KEY`) header — the
 * runtime routes every request through the auth `sign` hook, the only code
 * handed the raw credential.
 */
export class BloomerangClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
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
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        // Body already consumed or unreadable — the status still tells the story.
      }
      try {
        const parsed = JSON.parse(detail) as BloomerangError;
        if (parsed.Message) {
          detail = `${parsed.Message}${
            parsed.ErrorCode !== undefined ? ` (code ${parsed.ErrorCode})` : ""
          }`;
        }
      } catch {
        // Not JSON — the raw text read above is the more honest message.
      }
      throw new Error(
        `Bloomerang ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Drop keys whose value is `undefined`, so an update never sends a field the
 * caller simply did not mention. Bloomerang's PUT endpoints are full-resource
 * updates, and an explicit `null` — which this deliberately preserves — is the
 * documented way to clear a field.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
