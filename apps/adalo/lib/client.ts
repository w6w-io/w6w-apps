import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Adalo Collections API base. Every request is scoped to one Adalo app via a
 * path segment — `https://api.adalo.com/v0/apps/{appId}/collections/{collectionId}[/{recordId}]`
 * — confirmed live 2026-09-05:
 *
 *   - `GET https://api.adalo.com/` → `404 text/plain "Not Found"` (host is live, root is not a route).
 *   - `GET /v0/apps/{appId}/nonsense/{x}` → `404 text/plain "Not Found"` (unregistered route shape).
 *   - `GET /v0/apps/{appId}/collections` (no collection id) → `404` — there is NO endpoint that
 *     lists an app's Collections; Collection IDs are only visible in the Adalo builder's own
 *     per-app, per-collection "API Documentation" panel (Collection menu → API Documentation).
 *   - `GET /v0/apps/{appId}/collections/{collectionId}` with no `Authorization` header →
 *     `400 {"error":"No access token provided"}`.
 *   - Same request with a bogus Bearer token → `401 {"error":"Invalid access token"}`.
 *
 * Auth check runs BEFORE any collection-existence check (a bogus collection id with a bogus
 * token still answers the same 401, not a "collection not found" error), which is what makes the
 * `auth/api-key.ts` `test` hook safe to run against a placeholder collection id.
 *
 * Docs: https://help.adalo.com/integrations/the-adalo-api ,
 * https://help.adalo.com/integrations/the-adalo-api/collections . Rate limit is documented as
 * 5 requests/second per app (429 on excess).
 */
export const API_URL = "https://api.adalo.com/v0/apps";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * The Adalo App ID every request path needs. Adalo does not expose an
 * endpoint that reports it back, so it is collected once at connect time
 * (`auth/api-key.ts`) and echoed here from the redacted Connection's
 * `display`, rather than re-typed into every action alongside `collectionId`.
 */
export function appIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { appId?: string };
  const id = String(display.appId ?? "").trim();
  if (!id) {
    throw new Error("this connection has no App ID — reconnect it with the App ID field set");
  }
  return id;
}

/**
 * Thin wrapper over `ctx.fetch`, scoped to one Adalo app. Never sets
 * Authorization — the runtime routes the request through the auth `sign`
 * hook, which injects the Bearer API key.
 */
export class AdaloClient {
  constructor(private ctx: HookContext, private appId: string) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}/${encodeURIComponent(this.appId)}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Adalo ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}
