import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Every Drip endpoint except `GET /v2/accounts` and `GET /v2/user` is scoped
 * under `/v2/:account_id/...` — verified against developer.drip.com. The
 * account id identifies the account, not a single call, so it belongs to the
 * Connection (collected as an Auth field) rather than being re-entered as an
 * Action param on every action. `afterConnect` echoes it onto the
 * connection's display data, which is where the client reads it from.
 */
export const API_BASE = "https://api.getdrip.com/v2";

export function accountIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { accountId?: string };
  if (display.accountId) return display.accountId;
  throw new Error(
    "Drip connection has no account id — reconnect the account so it can be recorded.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a POST doesn't send explicit nulls. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Parse the "Properties" JSON param (used by both `record-event` and
 * `create-or-update-subscriber`'s custom fields) into a flat object. Accepts
 * either the map directly or a JSON string of it.
 */
export function jsonObject(raw: unknown, label: string): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${label}\` must be a JSON object, e.g. { "shirt_size": "Medium" }.`);
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  return entries.length ? parsed as Record<string, unknown> : undefined;
}

/**
 * Low-level request against an already-built base URL. Shared by
 * `DripClient` (account-scoped paths) and the two account-less endpoints
 * (`GET /v2/accounts`, `GET /v2/user`) that sit directly under `API_BASE`.
 * Never sets Authorization — the runtime routes every request through the
 * auth `sign` hook, which injects Drip's HTTP Basic scheme.
 */
export async function request<T = unknown>(
  ctx: HookContext,
  base: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${base}${path}`);
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

  const res = await ctx.fetch(url.toString(), init);
  if (!res.ok) {
    // Drip's validation errors carry an `errors` array with `code` and
    // `message` per attribute — the body is where the actionable part is.
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Drip ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Thin wrapper over `request`, scoped to this connection's account — the
 * shape almost every action needs (`/v2/:account_id/...`).
 */
export class DripClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = `${API_BASE}/${accountIdFromConnection(ctx.connection)}`;
  }

  request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return request<T>(this.ctx, this.base, path, options);
  }
}
