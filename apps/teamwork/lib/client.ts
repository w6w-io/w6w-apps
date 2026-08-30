import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Every Teamwork account lives on its own subdomain —
 * `{yourSiteName}.teamwork.com` — confirmed against
 * apidocs.teamwork.com/guides/teamwork/authentication's own curl examples
 * (`https://{yourSiteName}.teamwork.com/projects/api/v3/...`). A manifest
 * cannot enumerate those, so `w6w.network.allow` declares the wildcard
 * `*.teamwork.com`; the runtime's egress matcher accepts any subdomain of it
 * while still refusing everything else.
 *
 * The site name identifies the account, so it belongs to the Connection, not
 * an Action param — collected once as an Auth field and read back from the
 * connection's redacted `display` here, the same shape `freshdesk` uses for
 * its per-account `domain`.
 */
export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { domain?: string };
  if (display.domain) return display.domain;
  throw new Error(
    "Teamwork connection has no site name — reconnect the account so it can be recorded.",
  );
}

/**
 * V3 endpoints live under `/projects/api/v3/...`; the older V1 endpoints this
 * app also uses (project/task-list/milestone create+update+delete) sit
 * directly at the host root instead (e.g. `POST /projects.json`, NOT
 * `POST /projects/api/v3/projects.json`) — confirmed against the OpenAPI
 * document served from apidocs.teamwork.com's "Download Swagger" link, whose
 * `paths` carry no common prefix. Callers pass the full path including
 * whichever prefix (or none) the specific endpoint documents.
 */
export function baseUrl(domain: string): string {
  return `https://${domain}.teamwork.com`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null | (string | number)[]>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a partial update doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list of trimmed strings, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Split a comma-separated form field into a list of numeric ids, or leave it unset. */
export function csvIds(v: string | undefined): number[] | undefined {
  const items = csv(v);
  if (!items) return undefined;
  const ids = items.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  return ids.length ? ids : undefined;
}

/**
 * Teamwork's V3 error body — verified live 2026-08-30 against an unauthorized
 * request to `/projects/api/v3/people.json`:
 * `{"errors":[{"id":"...","title":"unexpected error","detail":"401: Not authorized"}]}`.
 * The legacy V1 endpoints (project/milestone/task-list create+update+delete)
 * answer `{"STATUS":"OK"}` on success and a differently-shaped body on error;
 * this reader is best-effort across both.
 */
export async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as {
      errors?: Array<{ title?: string; detail?: string }>;
      STATUS?: string;
      MESSAGE?: string;
    };
    if (body.errors?.length) {
      return body.errors.map((e) => e.detail ?? e.title).filter(Boolean).join("; ");
    }
    if (body.MESSAGE) return body.MESSAGE;
  } catch {
    // fall through to the raw text below
  }
  return text;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class TeamworkClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(domainFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        if (v.length) url.searchParams.set(k, v.join(","));
        continue;
      }
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
      const detail = await readError(res);
      throw new Error(
        `Teamwork ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
