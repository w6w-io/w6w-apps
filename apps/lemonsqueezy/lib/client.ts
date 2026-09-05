import type { HookContext } from "@w6w/types";

/**
 * Lemon Squeezy REST API client.
 *
 * Everything in this module was verified against Lemon Squeezy's own developer
 * documentation (`docs.lemonsqueezy.com/api`, fetched 2026-09-05 from the
 * page's own embedded MDX sources — the rendered HTML is a client-side Next.js
 * app whose resource docs are not present in a plain HTML fetch, so each page
 * was read from its React Server Components payload, which carries the exact
 * MDX the vendor authored) plus live probes against `api.lemonsqueezy.com` on
 * the same day. Nothing here came from a third-party integration directory.
 *
 * ## This is JSON:API, and that is load-bearing
 *
 * `docs.lemonsqueezy.com/api/getting-started/requests` states it outright:
 * "Lemon Squeezy API requests need to be made over HTTPS and follow the
 * JSON:API spec." Three consequences run through this file and every action:
 *
 *  - **Headers.** Both `Accept: application/vnd.api+json` AND
 *    `Content-Type: application/vnd.api+json` are required on every request —
 *    confirmed in the vendor's own authenticated-request example, which sends
 *    both on a plain `GET`, not only on writes.
 *  - **Envelope.** A single-resource response is
 *    `{ jsonapi, links, data: { type, id, attributes, relationships, links } }`;
 *    a list response is the same shape with `data` as an array plus
 *    `meta.page` and a `links` object carrying `first`/`last`/`next`/`prev`.
 *    Write bodies mirror it: `{ data: { type, attributes, relationships } }`.
 *  - **Bracketed query keys.** Pagination is `page[number]` / `page[size]`,
 *    filtering is `filter[<name>]=<value>` — both survive into the query
 *    string verbatim; see `request` below.
 *
 * ## Pagination
 *
 * `page[size]` defaults to 10, minimum 1, maximum 100. `page[number]` selects
 * the page. Every list action returns the full envelope (not just `data`) so
 * `meta.page` and `links.next` survive — a workflow needs them to walk a
 * result set wider than 100 rows.
 *
 * ## Failure is signalled honestly
 *
 * Live-probed 2026-09-05: `GET /v1/users/me` with no `Authorization` header
 * and with a bogus bearer token both answer a real `401`, never a `200` with
 * an error payload —
 * `{"jsonapi":{"version":"1.0"},"errors":[{"detail":"Unauthenticated.",
 * "status":"401","title":"Unauthorized"}]}`. So this client trusts `res.ok`,
 * but still reads the JSON:API `errors[].detail`/`.title` on failure, because
 * that is the part a caller can act on — never the HTTP status alone (a `401`
 * says nothing about which precondition failed; `errors[].detail` does).
 *
 * ## One host, no environment split
 *
 * Unlike Paddle or Apify, Lemon Squeezy does not run separate hosts for test
 * vs. live traffic — a Test-mode API key and a Live-mode key both call
 * `api.lemonsqueezy.com`; which dataset a request touches is decided entirely
 * by the key, and every resource carries its own `test_mode` boolean. There is
 * therefore no host-rewriting to do in `sign`, unlike `apps/paddle`.
 *
 * ## What this client does NOT do
 *
 * It never sets `Authorization`. That header is stamped by
 * `auth/api-key.ts`'s `sign` hook, the only place the credential is visible.
 * Actions reach the network exclusively through here, and here exclusively
 * through `ctx.fetch` — never global `fetch`, never `Deno.*`.
 */

/** The one host this app talks to. Mirrored by `w6w.network.allow`. */
export const API_HOST = "api.lemonsqueezy.com";

/** Base origin. */
export const API_ORIGIN = `https://${API_HOST}`;

/** Base URL every action path hangs off. */
export const API_URL = `${API_ORIGIN}/v1`;

/** The JSON:API media type. Required on both `Accept` and `Content-Type`. */
export const JSON_API_TYPE = "application/vnd.api+json";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Bracketed JSON:API keys (`filter[store_id]`, `page[number]`) passed through verbatim. */
  query?: Record<string, QueryValue>;
  /** A complete JSON:API document — `{ data: … }`. Build with {@link jsonApiBody}. */
  body?: Record<string, unknown>;
}

/**
 * Drop keys the caller left unset, so a write only sends what was filled in.
 *
 * `undefined` and `""` both mean "not supplied". `false` and `0` survive —
 * several attributes (`is_limited_to_products`, `disabled`, `amount`) are
 * meaningfully falsy, and dropping them would make them impossible to set.
 * `null` also survives: Lemon Squeezy's own update examples pass `null` to
 * clear an optional field (e.g. `pause: null` to unpause a subscription).
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Build a JSON:API write document: `{ data: { type, id?, attributes, relationships? } }`.
 *
 * `attributes` is run through {@link compact} so an update only touches the
 * fields the caller actually supplied. `relationships` is passed through
 * as-is — callers build it with {@link relationshipRef}.
 */
export function jsonApiBody(
  type: string,
  attributes: Record<string, unknown>,
  relationships?: Record<string, unknown>,
  id?: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = { type, attributes: compact(attributes) };
  if (id !== undefined) data.id = id;
  if (relationships && Object.keys(relationships).length > 0) data.relationships = relationships;
  return { data };
}

/** A single JSON:API relationship pointing at one resource, e.g. `{ store: {...} }`. */
export function relationshipRef(
  type: string,
  id: string | number | undefined,
): { data: { type: string; id: string } } | undefined {
  if (id === undefined || id === null || id === "") return undefined;
  return { data: { type, id: String(id) } };
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site. Used only for Lemon
 * Squeezy's free-form nested checkout objects (`product_options`,
 * `checkout_options`, `checkout_data`), whose full attribute lists are large
 * enough that exposing every field as its own Param would make the action
 * unusable — the common fields are real params; this is the escape hatch for
 * the rest.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** A JSON:API relationship pointing at several resources of the same type. */
export function relationshipRefs(
  type: string,
  ids: string | undefined,
): { data: Array<{ type: string; id: string }> } | undefined {
  if (!ids) return undefined;
  const list = ids.split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return undefined;
  return { data: list.map((id) => ({ type, id })) };
}

interface JsonApiErrorObject {
  status?: string;
  title?: string;
  detail?: string;
  code?: string;
}

interface JsonApiErrorDocument {
  jsonapi?: { version?: string };
  errors?: JsonApiErrorObject[];
}

/**
 * Turn a JSON:API error document into one actionable line.
 *
 * Reads `title` and `detail` — the vendor's own example
 * (`{"detail":"Unauthenticated.","status":"401","title":"Unauthorized"}`)
 * shows both are populated, and `detail` is the half that says *why*. Falls
 * back to the raw body when the response is not JSON (an edge or gateway
 * error page, for instance) so a failure never comes back as an empty string.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as JsonApiErrorDocument;
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

/** Lemon Squeezy's `meta.page` pagination block. */
export interface LsPage {
  currentPage?: number;
  from?: number;
  lastPage?: number;
  perPage?: number;
  to?: number;
  total?: number;
}

export interface LsLinks {
  first?: string;
  last?: string;
  next?: string;
  prev?: string;
  self?: string;
}

export interface LsEnvelope<T> {
  jsonapi?: { version?: string };
  meta?: { page?: LsPage; test_mode?: boolean };
  links?: LsLinks;
  data?: T;
  included?: unknown[];
}

export class LemonSqueezyClient {
  constructor(private ctx: HookContext) {}

  /** Full envelope (`data`, `meta`, `links`) — what every action returns. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<LsEnvelope<T>> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // `URLSearchParams` percent-encodes `[` and `]`. That is correct — the
      // brackets are part of the key name (`filter[store_id]`), not markup —
      // and Lemon Squeezy's Laravel backend decodes it the same way its own
      // documented example URLs do (`page%5Bnumber%5D=1`).
      url.searchParams.set(k, String(v));
    }

    // The vendor's "Requirements" section is explicit that BOTH headers "must
    // be included with all requests to the API" — not only writes. Its own
    // authenticated GET example sends `Content-Type` too, with no body, so
    // this sends both unconditionally rather than gating `Content-Type` on
    // `options.body` the way a non-JSON:API client normally would.
    const headers: Record<string, string> = {
      accept: JSON_API_TYPE,
      "content-type": JSON_API_TYPE,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = errorMessage(await res.text().catch(() => ""));
      throw new Error(
        `Lemon Squeezy ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    // Delete endpoints answer 204 with no body.
    if (res.status === 204) return {};
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text) as LsEnvelope<T>;
  }
}
