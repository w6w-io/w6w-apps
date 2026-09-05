import type { HookContext } from "@w6w/types";

/**
 * Formidable REST API v3 — verified against the vendor's own docs at
 * `formidableforms.com/knowledgebase/formidable-api-rest-endpoints/` (fetched
 * 2026-09-05), cross-checked with `.../formidable-api/` (the Send API Data /
 * legacy v2 article) and `.../using-application-passwords-for-api-authentication/`.
 *
 * ## `/frm/v2` is a frozen legacy surface — this app targets `/frm/v3`
 *
 * The vendor's own reference is explicit: *"Formidable API Add-On 2.0 uses
 * `/frm/v3` as the current REST namespace... The add-on keeps `/frm/v2` as a
 * frozen legacy namespace for existing integrations. Use `/frm/v3` for new
 * integrations."* `/frm/v2` also lacks whole resource families v3 has (styles,
 * form actions, form style assignment, Applications, Application items, View
 * layouts) and, per the same page, "does not receive the full 2.0 route
 * surface" going forward. Every route below is a `/frm/v3` route.
 *
 * ## There is no vendor host
 *
 * Formidable Forms is a **WordPress plugin**, not a SaaS. It registers its
 * REST namespace on the customer's own WordPress REST API, so the base URL is
 * per-site:
 *
 *   `https://{their-site}/wp-json/frm/v3`
 *
 * A subdirectory install shifts the whole route (`https://site.com/blog/wp-json/frm/v3`),
 * which is why the site URL is collected once as an Auth field, republished on
 * the Connection's redacted display data by `afterConnect`, and turned into a
 * base URL here — actions never see the credential, only that display value.
 * The manifest declares `network.allow: ["*"]`, the posture this pack already
 * uses for `gravityforms`, `gitea`, `ghost` and `mautic` — the endpoint is a
 * user-supplied URL, not a fixed vendor host.
 *
 * ## Two prerequisites that 404 look like a wrong URL
 *
 *   - **Formidable Forms Pro + the "Formidable API" add-on (2.0+)** must both
 *     be installed and active, on a plan that includes the API add-on
 *     (Business or higher per the vendor's current knowledgebase).
 *   - **REST API must be switched on** at Formidable -> Global Settings -> API.
 *     "When REST API is off, Formidable does not register the `/frm/v2` or
 *     `/frm/v3` routes" — every action then 404s, which reads exactly like a
 *     wrong site URL.
 *
 * ## Auth is a WordPress Application Password, not the legacy Formidable API key
 *
 * The legacy `frm_api_key` (Formidable -> Global Settings -> API) authenticates
 * only the old `/frm/v2` "Send API Data" webhook flow and, per the vendor's own
 * docs, "runs a request with administrator access" — it is not scoped to a
 * user's own permissions and is not documented as valid for `/frm/v3` at all.
 * `/frm/v3` (and the Abilities API / MCP surfaces) authenticate with a
 * **WordPress Application Password** sent as HTTP Basic — the WordPress
 * username plus a generated Application Password, carrying that user's own
 * Formidable permission set (configured at Formidable -> Global Settings ->
 * Permissions). See `auth/basic.ts`.
 */
export const REST_NAMESPACE = "frm/v3";

/** WordPress' REST API root, relative to the site URL. */
export const WP_REST_ROOT = "/wp-json";

/**
 * Public (redacted-safe) connection metadata. The auth method's `afterConnect`
 * hook publishes this onto `connection.display` so action code can compute the
 * base URL without touching the credential.
 */
export interface FormidableConnectionDisplay {
  /** Base URL of the WordPress install, e.g. `https://example.com` or `https://example.com/blog`. */
  siteUrl?: string;
}

/**
 * Normalise a user-entered site URL into a bare site root.
 *
 * Handles the three ways people paste it: with a trailing slash, with the
 * WordPress REST root already appended (`…/wp-json`), and with the whole
 * Formidable v3 route appended (`…/wp-json/frm/v3`). A subdirectory install's
 * path (`https://site.com/blog`) is preserved — stripping it would silently
 * point every request at the wrong place.
 */
export function normalizeSiteUrl(siteUrl: string): string {
  let site = String(siteUrl ?? "").trim();
  site = site.replace(/\/+$/, "");
  site = site.replace(new RegExp(`${WP_REST_ROOT}/${REST_NAMESPACE}$`, "i"), "");
  site = site.replace(new RegExp(`${WP_REST_ROOT}$`, "i"), "");
  return site.replace(/\/+$/, "");
}

/** `https://site.com/blog` -> `https://site.com/blog/wp-json/frm/v3`. */
export function resolveBaseUrl(display: FormidableConnectionDisplay | undefined): string {
  const site = normalizeSiteUrl(display?.siteUrl ?? "");
  if (!site) throw new Error("Formidable connection is missing siteUrl");
  return `${site}${WP_REST_ROOT}/${REST_NAMESPACE}`;
}

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === "";

/** Drop empty/undefined/null query values so an unset filter is never sent as a blank. */
export function compactQuery(
  query: Record<string, string | number | boolean | undefined | null>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (isEmpty(v)) continue;
    out[k] = String(v);
  }
  return out;
}

/** Drop keys the caller left unset, so a PATCH never overwrites an untouched field with `null`. */
export function compactBody(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isEmpty(v)) continue;
    out[k] = v;
  }
  return out;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** The WordPress REST API's standard error envelope, which Formidable's v3 routes ride on. */
interface WpRestError {
  code?: string;
  message?: string;
  data?: { status?: number };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential header — the
 * runtime routes every request through the auth `sign` hook, which is the
 * only code handed the credential.
 */
export class FormidableClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): FormidableClient {
    const display = (ctx.connection?.display ?? {}) as FormidableConnectionDisplay;
    return new FormidableClient(ctx, resolveBaseUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(compactQuery(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    if (!res.ok) {
      let parsed: WpRestError | undefined;
      try {
        parsed = text ? JSON.parse(text) as WpRestError : undefined;
      } catch {
        // Non-JSON body (a WordPress fatal, a proxy error page) — fall through.
      }
      const detail = parsed?.message ?? (text ? text.slice(0, 300) : res.statusText);
      const code = parsed?.code ? ` (${parsed.code})` : "";
      throw new Error(`Formidable ${res.status}${code} for ${method} ${url.pathname}: ${detail}`);
    }

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Formidable returned a non-JSON body for ${method} ${url.pathname}: ${text.slice(0, 200)}`,
      );
    }
  }
}
