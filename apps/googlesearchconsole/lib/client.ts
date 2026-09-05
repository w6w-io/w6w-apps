import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * One API, one host, two path prefixes — verified against Google's own
 * discovery document, fetched 2026-09-05:
 * `https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest`.
 *
 * The document's `rootUrl` is `https://searchconsole.googleapis.com/` with an
 * **empty** `servicePath` — every method's own `path` already carries its
 * full prefix, and that prefix is not uniform:
 *
 *   - `sites.*`, `sitemaps.*` and `searchanalytics.query` live under
 *     `webmasters/v3/...` — the legacy Webmaster Tools API name Search
 *     Console still serves these from.
 *   - `urlInspection.index.inspect` lives under `v1/urlInspection/...` — the
 *     newer, actually-`v1`-versioned surface.
 *
 * So `BASE` is the bare host and every action builds its own full path
 * (`webmasters/v3/...` or `v1/urlInspection/...`) rather than the two being
 * silently conflated behind one prefix constant.
 */
export const BASE = "https://searchconsole.googleapis.com";

/**
 * `urlTestingTools.mobileFriendlyTest.run` is also listed in the discovery
 * document, but it is deliberately NOT wired up here: Google retired the
 * Mobile-Friendly Test tool and its backing API on 2023-12-01
 * (`developers.google.com/search/blog/2023/11/mobile-friendly-test-tool-retirement`),
 * and calling it live (2026-09-05, unauthenticated) answers
 * `403 PERMISSION_DENIED — Method doesn't allow unregistered callers`, not a
 * normal auth challenge — a signed call fails the same way. The response
 * schema itself confirms the direction: `UrlInspectionResult.mobileUsabilityResult`
 * is flagged `"deprecated": true` in the same discovery document. Mobile
 * usability is reported instead through `url-inspection-inspect`'s
 * `indexStatusResult`, which is current.
 */

export interface GSCConnectionDisplay {
  /** The site this app's actions default to when a call omits `siteUrl`. */
  siteUrl?: string;
}

/**
 * Search Console addresses a site by its exact registered URI, in one of two
 * shapes: a URL-prefix property (`https://www.example.com/`, protocol and
 * trailing slash both significant) or a domain property (`sc-domain:example.com`).
 * Unlike GA4's numeric property id, there is no single normalization that
 * collapses accidental variants — a trailing slash actually changes which
 * property you address — so this only trims whitespace and requires the
 * result be non-empty, rather than guessing at a canonical form.
 */
export function requireSiteUrl(value: unknown, field = "siteUrl"): string {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error(`\`${field}\` is required`);
  return raw;
}

/** Resolve the site: the action's own param wins, else the connection's default. */
export function resolveSiteUrl(
  connection: RedactedConnection | undefined,
  override?: unknown,
): string {
  const explicit = String(override ?? "").trim();
  if (explicit) return explicit;
  const display = (connection?.display ?? {}) as GSCConnectionDisplay;
  if (display.siteUrl) return display.siteUrl;
  throw new Error(
    "no Search Console site — set one on the connection or pass `siteUrl` on the action",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a POST/PUT doesn't send empty fields. */
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

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class SearchConsoleClient {
  constructor(private ctx: HookContext) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE}/${path}`);
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
      // Google's error envelope is `{ "error": { "code", "message", "status" } }`
      // and never echoes the credential — the message names the offending
      // field or scope, which is the difference between "bad site" and
      // "not verified for this site".
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Search Console ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
