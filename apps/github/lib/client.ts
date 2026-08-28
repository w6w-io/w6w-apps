import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.github.com";

/**
 * The REST API version this app is written against. GitHub pins breaking
 * changes behind this header, so sending it keeps the app on a known contract
 * rather than whatever the default becomes.
 */
export const API_VERSION = "2022-11-28";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PATCH doesn't null out untouched fields. */
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

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** `owner/repo` path segment, each part encoded so neither can escape the path. */
export function repoPath(owner: string, repository: string): string {
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
}

/**
 * A `/`-separated path rendered as real URL path segments, each encoded so no
 * segment can escape the route it is spliced into. `.`, `..` and empty segments
 * are REFUSED rather than encoded: `new URL()` resolves dot-segments before the
 * request is sent, so passing them through would turn a contents-scoped action
 * into an arbitrary api.github.com call (measured: a path of `../../../../user`
 * resolves to `https://api.github.com/user`).
 */
export function contentsPath(path: string): string {
  const segments = path.split("/");
  for (const s of segments) {
    if (s === "" || s === "." || s === "..") {
      throw new Error(`Illegal path segment in "${path}": segments may not be empty, "." or "..".`);
    }
  }
  return segments.map(encodeURIComponent).join("/");
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class GitHubClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "x-github-api-version": API_VERSION,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // GitHub returns { message, errors: [...] } — surface both, they are the
      // difference between "bad token" and "field `title` is required".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `GitHub ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
