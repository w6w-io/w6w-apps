import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Tableau's REST API — verified against the vendor's own reference
 * (`help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm` and its
 * per-resource pages, fetched 2026-09-01).
 *
 * ## There is no vendor host
 *
 * Tableau Cloud is pod-hosted (`10ax.online.tableau.com`,
 * `us-east-1.online.tableau.com`, …) and Tableau Server is whatever address a
 * customer gave their own install. Neither is a fixed hostname this app can
 * allowlist, so the server address is a connection field — the same posture
 * this pack already uses for `gitea` and `mautic` — and `w6w.network.allow` is
 * `["*"]`.
 *
 * ## JSON is opt-in
 *
 * The API answers XML unless the request carries `Accept: application/json`.
 * Every request this app makes sets that header. Confirmed against the
 * "Query Data Sources" reference page, which publishes both the XML and JSON
 * shapes of the same response side by side.
 *
 * ## A single item does not come back as a 1-element array
 *
 * Tableau's XML-to-JSON conversion mirrors the XML structure literally: a list
 * response nests as `{ datasources: { datasource: [ {...}, {...} ] } }`, and
 * that inner value is an **array only when there is more than one element** —
 * a site with exactly one project answers `{ projects: { project: {...} } }`,
 * a bare object. `unwrapList` below exists so every list action gets this
 * right once instead of each one re-discovering it against a tenant that
 * happens to have exactly one of something.
 *
 * ## Pagination numbers are strings
 *
 * The `<pagination pageNumber="1" pageSize="100" totalAvailable="2"/>`
 * attributes cross into JSON as `{"pageNumber": "1", ...}` — still strings,
 * because XML attributes have no numeric type to preserve. `readPagination`
 * below does the `Number(...)` coercion once.
 */
export const DEFAULT_API_VERSION = "3.21";

/**
 * The version used ONLY for the unauthenticated `serverinfo` reachability
 * probe (`health/instance.ts`). `serverinfo` has answered since API 2.4, and
 * every server this app can point at is at least that old — so this constant
 * intentionally never tracks `DEFAULT_API_VERSION`: the probe must keep
 * working even against a site whose actual supported version is unknown.
 */
export const SERVER_INFO_API_VERSION = "2.4";

/** Public (redacted-safe) connection metadata, set by `afterConnect`. */
export interface TableauConnectionDisplay {
  /** The server origin, e.g. `https://10ax.online.tableau.com`. */
  baseUrl?: string;
  /** The site's contentUrl segment. Empty string is Tableau Server's default site. */
  siteContentUrl?: string;
  /** The site's LUID, needed on every `/sites/{siteId}/...` call. */
  siteId?: string;
  /** The LUID of the user the PAT signed in as. */
  userId?: string;
  apiVersion?: string;
}

/** What this app persists on the Connection. Never leaves `auth/` except via `afterConnect`. */
export interface TableauCredential {
  baseUrl: string;
  siteContentUrl: string;
  patName: string;
  patSecret: string;
  apiVersion: string;
  /** The live `X-Tableau-Auth` session token from the last sign-in. */
  token: string;
  siteId: string;
  userId: string;
  /** ISO 8601 — when the session token is expected to expire. */
  expiresAt?: string;
}

/**
 * Normalise a user-typed server URL into a bare origin.
 *
 * People paste `10ax.online.tableau.com`, `https://myco.com/`, and
 * `https://myco.com/api/3.21` alike. A missing scheme defaults to `https`: a
 * Personal Access Token in flight deserves TLS, and silently producing
 * `http://` from a bare hostname would downgrade that transport without being
 * asked to.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Tableau server URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Tableau server URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Tableau server URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the server origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as TableauConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Tableau connection records no server URL — reconnect it so the URL can be stored",
  );
}

/** Read the signed-in site's id and API version off the redacted Connection. */
export function siteFromConnection(
  connection: RedactedConnection | undefined,
): { siteId: string; apiVersion: string } {
  const display = (connection?.display ?? {}) as TableauConnectionDisplay;
  if (!display.siteId) {
    throw new Error(
      "this Tableau connection records no site id — reconnect it so the site can be resolved",
    );
  }
  return { siteId: display.siteId, apiVersion: display.apiVersion || DEFAULT_API_VERSION };
}

/**
 * Parse `estimatedTimeToExpiration`, returned only when signing in with a PAT.
 *
 * The format is `DAYS:HH:MM` — the docs are explicit that despite the name it
 * is NOT `hours:minutes:seconds`. Returns milliseconds until expiry, or
 * `undefined` when the field is absent or unparseable (username/password
 * sign-ins never carry it, and this app should degrade rather than throw).
 */
export function parseEstimatedExpiration(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parts = value.split(":");
  if (parts.length !== 3) return undefined;
  const [days, hours, minutes] = parts.map((p) => Number(p));
  if (![days, hours, minutes].every(Number.isFinite)) return undefined;
  return ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
}

/** Tableau's JSON error envelope: `{"error": {"code", "summary", "detail"}}`. */
interface TableauErrorBody {
  error?: { code?: string; summary?: string; detail?: string };
}

/** Format a Tableau error response into one readable line. Never echoes a credential. */
export function tableauErrorMessage(status: number, statusText: string, bodyText: string): string {
  let parsed: TableauErrorBody | null = null;
  try {
    parsed = bodyText ? (JSON.parse(bodyText) as TableauErrorBody) : null;
  } catch {
    parsed = null;
  }
  const err = parsed?.error;
  if (err?.summary || err?.detail) {
    const code = err.code ? ` (${err.code})` : "";
    return [err.summary, err.detail].filter(Boolean).join(": ") + code;
  }
  return `Tableau returned ${status} ${statusText}`.trim();
}

/**
 * Coerce Tableau's single-item-is-not-an-array quirk. `body` is the value
 * under the wrapper key (e.g. `body.datasources`); `itemKey` is the singular
 * element name Tableau nests it under (e.g. `"datasource"`).
 */
export function unwrapList<T>(wrapper: unknown, itemKey: string): T[] {
  const value = (wrapper as Record<string, unknown> | undefined)?.[itemKey];
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? (value as T[]) : [value as T];
}

/** `{pageNumber, pageSize, totalAvailable}`, as strings on the wire. */
export interface TableauPagination {
  pageNumber: number;
  pageSize: number;
  totalAvailable: number;
}

export function readPagination(body: unknown): TableauPagination | undefined {
  const p = (body as { pagination?: Record<string, unknown> } | undefined)?.pagination;
  if (!p) return undefined;
  return {
    pageNumber: Number(p.pageNumber) || 1,
    pageSize: Number(p.pageSize) || 0,
    totalAvailable: Number(p.totalAvailable) || 0,
  };
}

export interface SignInResult {
  token: string;
  siteId: string;
  userId: string;
  expiresAt?: string;
}

/**
 * `POST /api/{version}/auth/signin` with a Personal Access Token.
 *
 * Used by both `exchange` (first connect) and `refresh` (renewing a session
 * that idled out) — Tableau has no separate "refresh token" grant for a PAT
 * session; signing in again IS the refresh.
 */
export async function signIn(
  ctx: HookContext,
  params: {
    baseUrl: string;
    siteContentUrl: string;
    patName: string;
    patSecret: string;
    apiVersion: string;
  },
): Promise<SignInResult> {
  const base = normalizeBaseUrl(params.baseUrl);
  const res = await ctx.fetch(`${base}/api/${params.apiVersion}/auth/signin`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      credentials: {
        personalAccessTokenName: params.patName,
        personalAccessTokenSecret: params.patSecret,
        site: { contentUrl: params.siteContentUrl ?? "" },
      },
    }),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Tableau sign-in failed: ${tableauErrorMessage(res.status, res.statusText, text)}`,
    );
  }

  const body = text
    ? (JSON.parse(text) as {
      credentials?: {
        token?: string;
        estimatedTimeToExpiration?: string;
        site?: { id?: string };
        user?: { id?: string };
      };
    })
    : {};
  const creds = body.credentials;
  if (!creds?.token || !creds.site?.id) {
    throw new Error("Tableau sign-in succeeded but the response carried no token or site id");
  }

  const ttl = parseEstimatedExpiration(creds.estimatedTimeToExpiration);
  return {
    token: creds.token,
    siteId: creds.site.id,
    userId: creds.user?.id ?? "",
    expiresAt: ttl !== undefined ? new Date(Date.now() + ttl).toISOString() : undefined,
  };
}

/**
 * `POST /api/{version}/auth/signout`. Best-effort: a disconnect must succeed
 * locally even when the server is unreachable.
 */
export async function signOut(
  ctx: HookContext,
  params: { baseUrl: string; apiVersion: string; token: string },
): Promise<void> {
  try {
    const base = normalizeBaseUrl(params.baseUrl);
    await ctx.fetch(`${base}/api/${params.apiVersion}/auth/signout`, {
      method: "POST",
      headers: { "x-tableau-auth": params.token, accept: "application/json" },
    });
  } catch {
    // Best effort — the Connection is going away regardless.
  }
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` for the site-scoped surface
 * (`/api/{version}/sites/{siteId}/...`). Never sets the session header itself
 * — the runtime routes every action request through the auth `sign` hook,
 * which is the only code that reads the stored token.
 */
export class TableauClient {
  readonly base: string;
  readonly siteId: string;
  readonly apiVersion: string;

  constructor(ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
    const site = siteFromConnection(ctx.connection);
    this.siteId = site.siteId;
    this.apiVersion = site.apiVersion;
    this.ctx = ctx;
  }

  private ctx: HookContext;

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}/api/${this.apiVersion}/sites/${this.siteId}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Tableau ${init.method} ${url.pathname} failed: ${
          tableauErrorMessage(res.status, res.statusText, text)
        }`,
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Fetch a binary response (a view image) as base64 — the sandbox has no
   * Node `Buffer`, so this is built on the platform's `btoa` with the bytes
   * handled explicitly rather than as text.
   */
  async requestBinary(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ base64: string; contentType: string }> {
    const url = new URL(`${this.base}/api/${this.apiVersion}/sites/${this.siteId}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    const res = await this.ctx.fetch(url.toString(), { method: options.method ?? "GET" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Tableau GET ${url.pathname} failed: ${
          tableauErrorMessage(res.status, res.statusText, text)
        }`,
      );
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (const byte of buf) binary += String.fromCharCode(byte);
    return {
      base64: btoa(binary),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  /**
   * Walk `pageNumber`/`pageSize` paging until a short page or `wantTotal` is
   * reached. Every list response is `{ pagination, <wrapperKey>: { <itemKey>: [...] } }`.
   */
  async requestList<T = unknown>(
    path: string,
    wrapperKey: string,
    itemKey: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let pageNumber = 1;
    while (items.length < wantTotal) {
      const pageSize = Math.min(
        1000,
        Math.max(1, wantTotal === Infinity ? 100 : wantTotal - items.length),
      );
      const body = await this.request<Record<string, unknown>>(path, {
        ...options,
        query: { ...options.query, pageNumber, pageSize },
      });
      const rows = unwrapList<T>(body[wrapperKey], itemKey);
      items.push(...rows);
      const pagination = readPagination(body);
      if (rows.length < pageSize) break;
      if (pagination && items.length >= pagination.totalAvailable) break;
      pageNumber += 1;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}
