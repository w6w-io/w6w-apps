import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Booqable REST API client.
 *
 * Everything here was verified against Booqable's own developer documentation
 * (`developers.booqable.com`, "Booqable API v4", fetched 2026-09-06 as a single
 * ~3.5MB Slate-generated HTML page) plus live probes against
 * `status.booqable.com` on the same day. Nothing here came from a third-party
 * integration directory.
 *
 * ## Every account is its own host
 *
 * developers.booqable.com states it outright: "All API requests need to be
 * directed to the correct company-specific endpoint. The format is as
 * follows: `https://{company_slug}.booqable.com/api/4/`". There is no shared
 * gateway host — verified by every worked example in the docs, which all use
 * `https://example.booqable.com/api/4/...`. That is why the company slug is
 * collected on the Connection (see `auth/access-token.ts`) rather than as an
 * Action param, and why `w6w.network.allow` is the wildcard `*.booqable.com`
 * rather than a fixed host — the same shape `apps/freshdesk`/`apps/gorgias`
 * use for their own per-account hosts.
 *
 * ## Auth: a plain Bearer Access Token
 *
 * developers.booqable.com/Authentication documents TWO schemes: a static
 * "Access Token" sent as `Authorization: Bearer <token>`, and "Request
 * signing" — a client-generated, single-use JWT (ES256/RS256/HS256) good for
 * one request. This app implements only the Access Token scheme: it is the
 * one every worked `curl` example in the docs actually uses
 * (`--header 'Authorization: Bearer 9bcabeaa8278...'`), it needs no signing
 * logic that would have to live outside the network-less `sign` hook, and the
 * request-signing scheme is explicitly the advanced/optional path in
 * Booqable's own docs. Left out rather than guessed at.
 *
 * ## This is JSON:API
 *
 * "The Booqable API supports two response types `jsonapi` and `json`. By
 * default, the API returns `jsonapi` responses." This client always uses the
 * default: `{ data: { id, type, attributes, relationships }, meta }` for a
 * single resource, `{ data: [...], meta }` for a list, and
 * `{ data: { type, attributes, id? } }` for a write body — confirmed against
 * the docs' own create/update examples (`build with {@link jsonApiBody}`).
 * Errors are `{ "errors": [ { "code", "status", "title", "detail", "meta" } ] }`
 * — confirmed against several documented 422 examples (shortage, wrong
 * status, stock item conflicts).
 *
 * ## Pagination, filtering, sideloading
 *
 * List and search endpoints share one documented parameter set:
 * `page[number]` / `page[size]` for pagination, `filter[attribute][operator]`
 * for filtering (`eq`, `not_eq`, `gt`, `gte`, `lt`, `lte`, `prefix`, `suffix`,
 * `match`, … depending on the field's type — each resource's docs list which
 * operators its own fields support), `include` for JSON:API sideloading, and
 * `sort` (comma-separated, `-` prefix for descending). A `search` endpoint
 * (`POST /{resource}/search`) additionally accepts Booqable's "advanced
 * search" — an arbitrary nested `{ operator: "and"|"or", attributes: [...] }`
 * boolean tree — as its `filter` body key, verified against the docs' worked
 * `customers/search` example.
 *
 * ## What this client does NOT do
 *
 * It never sets `Authorization`. That header is stamped by
 * `auth/access-token.ts`'s `sign` hook, the only place the credential is
 * visible. Actions reach the network exclusively through here, and here
 * exclusively through `ctx.fetch` — never global `fetch`, never `Deno.*`.
 */

/** The redacted Connection field the company slug is recorded under. */
export function companySlugFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { companySlug?: string };
  if (display.companySlug) return display.companySlug;
  throw new Error(
    "Booqable connection has no company slug — reconnect the account so it can be recorded.",
  );
}

/** `https://{company_slug}.booqable.com/api/4` — no trailing slash. */
export function baseUrl(companySlug: string): string {
  return `https://${companySlug}.booqable.com/api/4`;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query-string parameters, e.g. `page[number]`, `filter[status][eq]`. */
  query?: Record<string, QueryValue>;
  /** A complete JSON:API-shaped body — build with {@link jsonApiBody}, or a raw hash for `/search`. */
  body?: Record<string, unknown>;
}

/**
 * Drop keys the caller left unset, so a write only touches fields the caller
 * actually supplied. `undefined` and `""` both mean "not supplied"; `false`
 * and `0` survive, since several attributes (`email_marketing_consented`,
 * `discount_percentage`) are meaningfully falsy.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Build a JSON:API write document: `{ data: { type, id?, attributes } }`.
 *
 * Unlike some JSON:API vendors, Booqable's own create/update examples put
 * related-record ids directly in `attributes` (`customer_id`,
 * `product_group_id`, `tax_region_id`, …) rather than under a
 * `relationships` object — so this helper carries no `relationships` param.
 */
export function jsonApiBody(
  type: string,
  attributes: Record<string, unknown>,
  id?: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = { type, attributes: compact(attributes) };
  if (id !== undefined) data.id = id;
  return { data };
}

interface BqErrorObject {
  code?: string;
  status?: string;
  title?: string;
  detail?: string;
}

interface BqErrorDocument {
  errors?: BqErrorObject[];
}

/**
 * Turn a Booqable JSON:API error document into one actionable line.
 *
 * Reads `title` and `detail` — every documented 422 example populates both
 * (e.g. `{"code":"items_not_available","title":"Items not available",
 * "detail":"One or more items are not available"}`). Falls back to the raw
 * body when the response is not JSON.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as BqErrorDocument;
    const first = body.errors?.[0];
    if (first) {
      const parts = [first.title, first.detail].filter((s): s is string => !!s);
      if (parts.length) return parts.join(": ");
    }
  } catch {
    // Not JSON.
  }
  return text.slice(0, 400);
}

export interface BqResource<T = Record<string, unknown>> {
  id: string;
  type: string;
  attributes: T;
  relationships?: Record<string, unknown>;
}

export interface BqEnvelope<T = Record<string, unknown>> {
  data?: BqResource<T> | BqResource<T>[] | Array<{ id: string }>;
  included?: unknown[];
  meta?: Record<string, unknown>;
}

export class BooqableClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(companySlugFromConnection(ctx.connection));
  }

  async request<T = Record<string, unknown>>(
    path: string,
    options: RequestOptions = {},
  ): Promise<BqEnvelope<T>> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // `URLSearchParams` percent-encodes `[` and `]`. That is correct — the
      // brackets are part of the key name (`filter[status][eq]`), not markup —
      // and Booqable's own documented example URLs are shown pre-encoded the
      // same way (`filter%5Bstatus%5D%5Beq%5D=...`).
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
      const detail = errorMessage(await res.text().catch(() => ""));
      throw new Error(
        `Booqable ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text) as BqEnvelope<T>;
  }
}
