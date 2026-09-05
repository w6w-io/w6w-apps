import type { HookContext } from "@w6w/types";

/**
 * The Admin SDK Directory API lives entirely under one host and one base
 * path — unlike Drive/Sheets there is no separate upload origin to reach.
 */
export const API_URL = "https://admin.googleapis.com/admin/directory/v1";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON object → JSON-encoded body. Explicit `null`/`undefined` → no body. */
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Auth is applied by the runtime through the
 * auth `sign` hook, so we never touch Authorization here.
 */
export class GoogleAdminClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {};
    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const init: RequestInit = { method: options.method ?? "GET", headers, body };
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Google Admin ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return res.json() as Promise<T>;
    return undefined as T;
  }
}

/**
 * Build the `{+orgUnitPath}` path segment the orgunits endpoints expect: the
 * Discovery doc marks it a "reserved expansion" (RFC 6570 `{+var}`), meaning
 * slashes inside it are literal path separators, not something to escape —
 * `orgUnitPath` "Sales/Support" becomes `.../orgunits/Sales/Support`, not
 * `.../orgunits/Sales%2FSupport`. Each individual segment still needs its own
 * characters percent-encoded; only the slash must survive unescaped. Accepts
 * either a leading-slash form (`/Sales/Support`) or the bare form the API
 * itself documents ("minus the leading /") and normalizes to the latter.
 */
export function encodeOrgUnitPath(orgUnitPath: string): string {
  const trimmed = orgUnitPath.replace(/^\/+/, "");
  return trimmed.split("/").map(encodeURIComponent).join("/");
}
