import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Kommo's CRM API v4 — verified against `developers.kommo.com` (fetched
 * 2026-09-05 via the ReadMe project's own `/api/v1/docs/<slug>` JSON, which
 * returns each reference page's raw method/params/example body): `account`,
 * `account-parameters`, `oauth20`, `get-token`, `long-lived-token`,
 * `private-integration`, `http-codes`, `limitations`, `leads-list`,
 * `adding-leads`, `getting-a-lead-by-its-id`, `updating-single-lead`,
 * `contacts-list`, `add-contacts`, `get-contact`, `update-contact`,
 * `companies-list`, `add-companies`, `get-company`, `updating-company`.
 *
 * **Every account has its own host, and it is not always `.kommo.com`.** The
 * base URL is `https://{subdomain}.kommo.com/api/v4` for accounts created
 * after the 2024 amoCRM -> Kommo rebrand — but the reference docs' own
 * example responses (`get-contact`, among others) still link back to
 * `https://example.amocrm.com/api/v4/...`, confirming the legacy domain is
 * still live and answering for accounts that never moved. Neither host is
 * knowable in advance, so the account's full domain is a connection field
 * and `w6w.network.allow` lists both `*.kommo.com` and `*.amocrm.com`.
 */
export const API_PATH = "/api/v4";

/** Public (redacted-safe) connection metadata. */
export interface KommoConnectionDisplay {
  /** The account's own host, e.g. `acme.kommo.com` or `acme.amocrm.com`. */
  accountDomain?: string;
  accountName?: string;
  accountId?: number;
}

/**
 * Normalise a user-typed account address into a bare `host`.
 *
 * Accepts a bare subdomain (`acme`), a bare host (`acme.kommo.com`), or a
 * full pasted URL (`https://acme.kommo.com/`) with any path stripped. A bare
 * label with no dot is assumed to be a `.kommo.com` subdomain — the current
 * (post-rebrand) domain — since that is what Kommo's own docs show in every
 * example going forward; an operator on the legacy domain types the full
 * `acme.amocrm.com` host instead.
 */
export function normalizeAccountDomain(raw: string): string {
  const trimmed = String(raw ?? "").trim().toLowerCase();
  if (!trimmed) throw new Error("Kommo account address is empty");
  const withoutScheme = trimmed.replace(/^https?:\/\//, "");
  const host = withoutScheme.split(/[/?#]/)[0];
  if (!host) throw new Error(`Kommo account address has no host: ${raw}`);
  if (host.endsWith(".kommo.com") || host.endsWith(".amocrm.com")) return host;
  if (!host.includes(".")) return `${host}.kommo.com`;
  throw new Error(
    `"${raw}" doesn't look like a Kommo account address — use the subdomain alone (e.g. "acme"), ` +
      'or the full address (e.g. "acme.kommo.com" or "acme.amocrm.com" for a pre-rebrand account).',
  );
}

/** Read the account's host off the redacted Connection. Never touches the credential. */
export function accountDomainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as KommoConnectionDisplay;
  if (display.accountDomain) return display.accountDomain;
  throw new Error(
    "this Kommo connection records no account address — reconnect it so it can be stored",
  );
}

export function baseUrl(accountDomain: string): string {
  return `https://${accountDomain}${API_PATH}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so an edit does not overwrite untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-string or already-parsed param into an array, or leave it unset. */
export function jsonArray(v: unknown): unknown[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const parsed = typeof v === "string" ? JSON.parse(v) : v;
  if (!Array.isArray(parsed)) throw new Error("expected a JSON array");
  return parsed.length ? parsed : undefined;
}

/** Comma-separated tag names -> Kommo's `[{ name }]` shape for `tags_to_add`/`tags_to_delete`. */
export function tagList(v: unknown): Array<{ name: string }> | undefined {
  const names = csv(v);
  return names?.map((name) => ({ name }));
}

/**
 * Kommo's one documented error envelope (`http-codes`): `application/problem+json`
 * — `{ title, type, status, detail }`, with a `validation-errors` array bolted
 * on for a 400. Both are folded into one readable string; the raw body is
 * returned verbatim if neither shape matches, so a body that changes shape
 * does not surface as "undefined".
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as {
      title?: string;
      detail?: string;
      "validation-errors"?: Array<{ errors?: Array<{ path?: string; detail?: string }> }>;
    };
    const parts: string[] = [];
    if (body.title || body.detail) {
      parts.push([body.title, body.detail].filter(Boolean).join(": "));
    }
    for (const group of body["validation-errors"] ?? []) {
      for (const e of group.errors ?? []) {
        if (e.path || e.detail) parts.push(`${e.path ?? "?"}: ${e.detail ?? ""}`.trim());
      }
    }
    if (parts.length) return parts.join("; ");
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class KommoClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(accountDomainFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
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
      const detail = errorMessage(text);
      throw new Error(
        `Kommo ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    // A 204 (e.g. an empty collection) and a body-less 200 both carry nothing to parse.
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * List endpoints wrap their collection in `_embedded.<collectionKey>` —
   * `leads`, `contacts` or `companies`. Paging is page-based (`page`/`limit`,
   * 250 max per page): a page shorter than the requested `limit` is the
   * signal there is nothing more to fetch, since Kommo states no separate
   * total count on these endpoints.
   */
  async requestPage<T = unknown>(
    path: string,
    collectionKey: string,
    options: RequestOptions & { page?: number; limit?: number } = {},
  ): Promise<{ items: T[]; page: number; hasMore: boolean }> {
    const page = options.page ?? 1;
    const limit = Math.min(250, Math.max(1, options.limit ?? 50));
    const body = await this.request<Record<string, unknown> | undefined>(path, {
      ...options,
      query: { ...options.query, page, limit },
    });
    const collection = body?._embedded as Record<string, unknown> | undefined;
    const items = (collection?.[collectionKey] as T[] | undefined) ?? [];
    return { items, page, hasMore: items.length === limit };
  }

  /**
   * `POST /leads|contacts|companies` — Kommo requires a top-level JSON ARRAY
   * even to create one record (confirmed against `adding-leads`' own request
   * example, a two-element array), and echoes back only `id`/`request_id`/
   * `_links` for each created row — never the fields it was given. There is
   * no follow-up read here: an action that needs the full record calls the
   * matching `*-get` action afterwards.
   */
  async createOne(
    path: string,
    collectionKey: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown> & { id: number }> {
    const res = await this.request<{ _embedded?: Record<string, unknown> }>(path, {
      method: "POST",
      body: [body],
    });
    const rows = (res._embedded?.[collectionKey] as
      | Array<Record<string, unknown> & { id: number }>
      | undefined) ??
      [];
    if (!rows.length) throw new Error(`Kommo did not echo back a created ${collectionKey} row`);
    return rows[0];
  }

  /**
   * `PATCH /leads|contacts|companies/{id}` — takes a plain object body (not
   * an array, unlike create), but the RESPONSE still comes back wrapped in
   * the collection envelope (`_embedded.<collectionKey>[0]`) rather than as a
   * bare object — confirmed against `updating-single-lead` and
   * `update-contact`'s own response examples. Kommo echoes back only `id`,
   * `updated_at`, and (for contacts/companies) `name` and the delete/unsorted
   * flags — never the rest of the record.
   */
  async updateOne(
    path: string,
    collectionKey: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await this.request<{ _embedded?: Record<string, unknown> }>(path, {
      method: "PATCH",
      body,
    });
    const rows = (res._embedded?.[collectionKey] as Array<Record<string, unknown>> | undefined) ??
      [];
    if (!rows.length) throw new Error(`Kommo did not echo back the updated ${collectionKey} row`);
    return rows[0];
  }
}
