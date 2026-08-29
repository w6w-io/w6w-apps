import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Gorgias gives every account its own host — `<domain>.gorgias.com` — verified
 * against developers.gorgias.com/reference/requests ("Make sure that all your
 * requests are made against your Gorgias domain... `https://green-garden.gorgias.com/api/`").
 * A manifest cannot enumerate those, so `w6w.network.allow` declares the
 * wildcard `*.gorgias.com`; the runtime's egress matcher accepts any
 * subdomain of it while still refusing everything else.
 *
 * The domain itself comes from the Connection, not from an Action param: it
 * identifies the account, so it belongs to the Connection. `afterConnect`
 * echoes it onto the connection's display data, which is where the client
 * reads it from — the same pattern `apps/freshdesk` uses for its own
 * per-account host.
 */
export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { domain?: string };
  if (display.domain) return display.domain;
  throw new Error(
    "Gorgias connection has no domain — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(domain: string): string {
  return `https://${domain}.gorgias.com/api`;
}

/** HTTP Basic `email:apiKey` — Gorgias's private-app scheme (reference/authentication). */
export function basicHeader(email: string, apiKey: string): string {
  return `Basic ${btoa(`${email}:${apiKey}`)}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

interface GorgiasError {
  error?: { msg?: string };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class GorgiasClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(domainFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
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
    if (!res.ok) {
      // Gorgias returns `{ "error": { "msg": "..." } }` — verified against
      // developers.gorgias.com/reference/errors and a live 401 response.
      const text = await res.text();
      let message = text;
      try {
        const parsed = JSON.parse(text) as GorgiasError;
        if (parsed.error?.msg) message = parsed.error.msg;
      } catch {
        // not JSON — fall back to the raw body
      }
      throw new Error(
        `Gorgias ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${message}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
