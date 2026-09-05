import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Jira Service Management's own REST surface, distinct from Jira Software's
 * `/rest/api/3` — service desks, request types, customer requests, queues,
 * SLAs and organizations live here instead. Verified live against the public
 * OpenAPI document at
 * https://developer.atlassian.com/cloud/jira/service-desk/swagger.json.
 */
export const API_PATH = "/rest/servicedeskapi";

/**
 * Jira Service Management Cloud is reachable two ways, exactly like the
 * sibling `jira` app — it is the same per-tenant Atlassian Cloud site, just a
 * different REST prefix:
 *
 *   - **API token** — the site's own host, `acme.atlassian.net`. The site name
 *     is an Auth field, recorded on the connection's `display`.
 *   - **OAuth 2.0 (3LO)** — a shared gateway, `api.atlassian.com/ex/jira/{cloudId}`.
 *     The cloud id is resolved from `/oauth/token/accessible-resources` in
 *     `afterConnect` and recorded the same way.
 *
 * Both hosts are on the egress allowlist; `*.atlassian.net` covers the first
 * because no manifest can enumerate customer sites.
 */
export function baseFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { site?: string; cloudId?: string };
  if (display.cloudId) return `https://api.atlassian.com/ex/jira/${display.cloudId}${API_PATH}`;
  if (display.site) return `https://${display.site}.atlassian.net${API_PATH}`;
  throw new Error(
    "Jira Service Management connection has neither a site nor a cloud id — reconnect so one can be recorded.",
  );
}

export type QueryValue = string | number | boolean | string[] | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a trimmed, non-empty list. */
export function csv(v: string | undefined): string[] | undefined {
  const s = unset(v);
  if (!s) return undefined;
  const list = s.split(",").map((x) => x.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

/**
 * Best-effort extraction of a readable message from a non-2xx response body.
 *
 * Two documented shapes exist and neither is guaranteed: the OpenAPI schema's
 * own `ErrorResponse` (`{ errorMessage, i18nErrorMessage }`) for a validation
 * failure, and the classic Jira platform shape (`{ errorMessages, errors }`)
 * some shared infrastructure still emits. But measured live (2026-09-05,
 * `ecosystem.atlassian.net`), an unauthenticated or badly-authenticated
 * request gets neither: HTTP 401 with a PLAIN-TEXT body — "Client must be
 * authenticated to access this resource." — mislabeled
 * `content-type: text/html`. So this never assumes JSON; it falls back to the
 * raw text, trimmed, whatever shape it turns out to be.
 */
export async function readErrorDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `${res.status} ${res.statusText}`.trim();
  try {
    const body = JSON.parse(text) as {
      errorMessage?: string;
      errorMessages?: string[];
      errors?: Record<string, string>;
    };
    const parts: string[] = [];
    if (body.errorMessage) parts.push(body.errorMessage);
    if (body.errorMessages?.length) parts.push(...body.errorMessages);
    if (body.errors) parts.push(...Object.entries(body.errors).map(([k, v]) => `${k}: ${v}`));
    if (parts.length > 0) return parts.join("; ");
  } catch {
    // Not JSON — the plain-text 401 case above, or something similarly bare.
  }
  return text.slice(0, 300);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class JsmClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseFromConnection(ctx.connection);
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

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await readErrorDetail(res);
      throw new Error(
        `Jira Service Management ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
