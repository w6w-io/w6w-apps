import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Dust REST API client (`dust.tt` / `eu.dust.tt`).
 *
 * Verified 2026-09-05 against the vendor's own OpenAPI 3.0 document, fetched
 * two ways that agree byte-for-byte on every path checked here:
 *
 *   - `https://raw.githubusercontent.com/dust-tt/dust/refs/heads/main/front-api/public/swagger.json`
 *     (`dust-tt/dust` is the product's own monorepo, not a third-party mirror)
 *   - the same document re-served through the docs site's Mintlify pages
 *     (`docs.dust.tt/api-reference/**\/*.md`, each embedding the relevant
 *     OpenAPI fragment inline)
 *
 * `info.version` `1.0.2`, 92 paths. Every endpoint this app calls was also
 * exercised live against `https://dust.tt` with a syntactically-invalid
 * credential to confirm the error envelope (see "Errors" below).
 *
 * ## Two regional hosts, not one
 *
 * The OpenAPI document declares two `servers`, and they are not
 * interchangeable: `https://dust.tt` (`us-central1`) and
 * `https://eu.dust.tt` (`europe-west1`). A workspace lives in exactly one
 * region, and its API key only works against that region's host — the
 * vendor's own JS SDK (`@dust-tt/client`, read from its published bundle)
 * takes the host as a plain constructor option with `https://dust.tt` as the
 * default, confirming there is no single canonical host that routes for
 * every workspace. `auth/api-key.ts` collects the region as a connect-time
 * field for exactly this reason, and this module resolves the host from it.
 *
 * ## Everything hangs off the workspace id
 *
 * Every documented v1 path starts `/api/v1/w/{wId}/...` — the workspace a key
 * was minted in. There is no way to address a different workspace with the
 * same key. `wId` is not a secret (it is the short id shown in the
 * workspace's own URL and settings), so it is collected as its own connect
 * field and echoed onto the Connection's `display` by `afterConnect`, the
 * same shape as `apps/kustomer/lib/client.ts`'s `orgSubdomain` — actions read
 * it from there rather than through the credential, which they never see.
 *
 * ## Auth
 *
 * `Authorization: Bearer <api key>` (the OpenAPI document's sole
 * `securitySchemes` entry, `BearerAuth`, `scheme: bearer`). Dust API keys are
 * minted per-workspace under Workspace Settings > API Keys and are always
 * prefixed `sk-`; a bearer value that doesn't parse as that shape is refused
 * before it is even looked up (see `malformed_authorization_header_error`
 * below) — the wire evidence a static read of the docs would not surface.
 *
 * ## Errors
 *
 * A non-2xx response body is `{"error": {"type", "message"}}`. Three codes
 * were verified live against `https://dust.tt/api/v1/w/x/spaces`:
 *
 *   - **no `Authorization` header at all** → `401 not_authenticated`
 *   - **a bearer value not shaped like a Dust key** (no `sk-` prefix, or the
 *     wrong length) → `401 malformed_authorization_header_error` — this is
 *     surfaced BEFORE the key is even looked up, so it means "this doesn't
 *     look like a Dust API key" rather than "this key is wrong"
 *   - **a syntactically valid but unknown/disabled key** → `401
 *     invalid_api_key_error`
 *
 * `formatDustError` surfaces the vendor's own `type` because the fix differs:
 * the first two mean "reconnect", the third could also mean "revoked in
 * Workspace Settings". Every other status/type this app has not independently
 * observed is still reported using the same envelope's fields when present.
 *
 * ## Pagination
 *
 * List endpoints in this app's surface are not vendor-paginated except
 * `GET .../conversations/{cId}` (`limit` + a `lastValue` rank cursor) — agent
 * and space lists are returned whole, per the schema's own shape (a bare
 * array under one key, no `meta`/`next` envelope of any kind).
 */

/** us-central1 is the OpenAPI document's first (and default) server. */
export const HOSTS: Record<string, string> = {
  us: "https://dust.tt",
  eu: "https://eu.dust.tt",
};

export const API_PREFIX = "/api/v1";

export function regionOf(region: string | undefined): "us" | "eu" {
  return region === "eu" ? "eu" : "us";
}

export function hostFor(region: string | undefined): string {
  return HOSTS[regionOf(region)];
}

/** Public (redacted-safe) connection metadata this client depends on. */
export interface DustConnectionDisplay {
  workspaceId?: string;
  region?: string;
}

export interface DustContext {
  host: string;
  workspaceId: string;
}

/**
 * Resolve the workspace host + id from the Connection's public metadata.
 * Throws rather than silently building a request against no workspace at
 * all — every path in this app's surface needs both.
 */
export function resolveContext(connection: RedactedConnection | undefined): DustContext {
  const display = (connection?.display ?? {}) as DustConnectionDisplay;
  const workspaceId = display.workspaceId?.trim();
  if (!workspaceId) {
    throw new Error("Dust connection records no workspace id — reconnect so one can be recorded.");
  }
  return { host: hostFor(display.region), workspaceId };
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface DustErrorBody {
  error?: { type?: string; message?: string };
}

/** Drop keys the caller left unset — Dust treats an absent query param and an omitted one alike. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Render a short, actionable message from Dust's `{"error": {"type", "message"}}` envelope. */
export async function formatDustError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null) as DustErrorBody | null;
  const type = body?.error?.type;
  const message = body?.error?.message;
  if (type && message) return `Dust returned ${res.status} ${type}: ${message}`;
  if (message) return `Dust returned ${res.status}: ${message}`;
  return `Dust returned HTTP ${res.status}`;
}

export class DustClient {
  #ctx: HookContext;
  #base: DustContext;

  constructor(ctx: HookContext) {
    this.#ctx = ctx;
    this.#base = resolveContext(ctx.connection);
  }

  get workspaceId(): string {
    return this.#base.workspaceId;
  }

  buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(
      `${this.#base.host}${API_PREFIX}/w/${encodeURIComponent(this.#base.workspaceId)}${path}`,
    );
    for (const [key, value] of Object.entries(compact(query ?? {}))) {
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  /** Raw fetch, parsed JSON, no envelope assumptions — every response shape here is a bare object. */
  async json<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.#ctx.fetch(this.buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) throw new Error(await formatDustError(res));
    if (res.status === 204) return undefined as T;
    return await res.json() as T;
  }
}
