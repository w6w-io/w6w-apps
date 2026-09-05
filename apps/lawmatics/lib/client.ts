/**
 * Shared HTTP client for Lawmatics' REST API (`api.lawmatics.com/v1`).
 *
 * Verified against the vendor's own Postman collection, published at
 * https://docs.lawmatics.com/ (a Postman Documenter page, "Lawmatics OAuth API
 * v1.22.0"; fetched via the page's own data endpoint,
 * `docs.lawmatics.com/api/collections/{ownerId}/{publishedId}`, 1.29 MB, 2026-09-05)
 * — never inferred from a sibling app or the marketing site.
 *
 * Two shapes matter everywhere in this app:
 *
 *   - Every resource read/write answers a JSON:API-flavoured envelope:
 *     `{"data": {"id", "type", "attributes", "relationships"}}` for a single
 *     record, `{"data": [...], "meta": {total_pages, limit_per_page,
 *     total_entries}, "links": {self, next, prev}}` for a list. `meta`/`links`
 *     are read straight off a live example in the collection (a page-6-of-11
 *     Contacts list).
 *   - Every error answers `{"errors": [{"status", "title", "detail"}]}` — a
 *     404 ("File with id invalidId was not found.") and a 422 ("Filter By
 *     Parameter Not Available") both confirmed live in the collection's saved
 *     responses. This app classifies a failed credential from THIS body, never
 *     from the bare HTTP status, per the vendor's own shape.
 *
 * Lawmatics' OAuth token never expires and is never rotated (see
 * `auth/oauth2.ts`), so there is no refresh path here to guard.
 */
import type { HookContext } from "@w6w/types";

/** Confirmed fixed, shared host — not per-tenant. Every customer's data lives behind this one origin. */
export const API_URL = "https://api.lawmatics.com/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

interface LawmaticsErrorEntry {
  status?: number;
  title?: string;
  detail?: string;
}

interface LawmaticsErrorBody {
  errors?: LawmaticsErrorEntry[];
}

export interface LawmaticsResource<T = Record<string, unknown>> {
  id: string;
  type: string;
  attributes: T;
  relationships?: Record<string, unknown>;
}

export interface LawmaticsMeta {
  total_pages?: number;
  limit_per_page?: number;
  total_entries?: number;
}

export interface LawmaticsLinks {
  self?: string;
  next?: string;
  prev?: string;
}

export interface LawmaticsItemEnvelope<T = Record<string, unknown>> {
  data: LawmaticsResource<T>;
}

export interface LawmaticsListEnvelope<T = Record<string, unknown>> {
  data: LawmaticsResource<T>[];
  meta?: LawmaticsMeta;
  links?: LawmaticsLinks;
}

/** Read `errors[0]`'s `title`/`detail` out of a Lawmatics error body, when present. */
export function firstErrorMessage(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as LawmaticsErrorBody;
    const first = body.errors?.[0];
    if (!first) return undefined;
    return [first.title, first.detail].filter(Boolean).join(": ") || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes
 * every action request through the auth `sign` hook, which injects it.
 */
export class LawmaticsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
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
      const detail = firstErrorMessage(text) ?? text;
      throw new Error(
        `Lawmatics ${res.status} for ${init.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** Drop keys the caller left unset so a create doesn't send blank strings as real values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}
