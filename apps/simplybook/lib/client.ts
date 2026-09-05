import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * SimplyBook.me **Admin REST API v2** — verified 2026-09-05 against the live
 * OpenAPI document served from the vendor's own developer portal.
 *
 * The doc page at `simplybook.me/api/doc` is a Swagger UI shell; the actual
 * machine-readable spec is not linked as a static asset anywhere in that HTML
 * — it is fetched at runtime by the embedded `SwaggerUIBundle` from
 * `https://simplybook.me/api/swagger-admin` (and `/api/swagger-public` for the
 * separate, unauthenticated-widget-flavoured API this app does NOT use). Both
 * return a full OpenAPI 3.0 document on a plain `GET`, no auth required.
 *
 * ## There is also an older, completely different API at a similar-looking host
 *
 * The same doc page also documents a legacy **JSON-RPC** API at
 * `https://user-api.simplybook.me` (no `-v2`) — a `getToken`/`login` +
 * positional-args RPC style predating this REST API. It is a different
 * product with a different auth flow, described inline in the same HTML.
 * This app targets only the REST v2 API (`user-api-v2.simplybook.me`), which
 * is what the fetched OpenAPI document actually describes.
 *
 * ## Which host to call is not decidable from the credential alone
 *
 * The OpenAPI document lists **thirteen** `servers` entries — a default
 * global host plus regional and Enterprise-specific ones (`.it`, `.asia`,
 * `.vip`, `.cc`, `.us`, `.pro`, `enterpriseappointments.com`, a Webnode
 * integration host, `servicebookings.net`, and three UK-registrar white-label
 * hosts). Nothing in the auth response says which one a given company is
 * hosted on — there is no lookup/discovery endpoint. Most companies are on
 * the default global host; Enterprise customers are told their assigned host
 * out of band. `apiBase` is therefore a connect-time field (default
 * {@link DEFAULT_API_BASE}), echoed into the connection's display metadata by
 * `afterConnect` (see `../auth/login.ts`) so every action can read it back via
 * {@link apiBaseOf} — the same "domain lives in the credential, echoed into
 * display for actions to read" shape as this pack's `auth0` app.
 *
 * ## Auth is a two-step exchange, not a static key
 *
 * `POST /admin/auth` accepts `{company, login, password}` and returns a
 * `TokenEntity` — `token` + `refresh_token`, NOT the password itself — which
 * every subsequent call carries as two headers: `X-Company-Login` and
 * `X-Token`. The description text on the endpoint also documents a second,
 * narrower credential shape: passing an **API User Key** (Settings → API User
 * Keys) as the `password` field bypasses IP-allowlist verification that a
 * real user password is subject to. See `../auth/login.ts` for the 2FA
 * failure mode neither of those bypasses.
 *
 * ## Errors are a flat, undocumented-but-discoverable shape
 *
 * The OpenAPI document's `responses` blocks say nothing more than "Bad
 * request" / "Access denied or Forbidden" for 400/403 — no error schema is
 * given. A live probe (`POST /admin/auth` with a bogus company) returns
 * `{"code":400,"message":"Invalid company","data":[],"message_data":[]}` —
 * confirmed to carry no part of the submitted credential back in the body.
 *
 * ## Expired tokens answer HTTP 419, not 401
 *
 * Every write/read endpoint in the document that can fail on auth documents a
 * `419 "Token Expired"` response — the historical "Page/Token Expired" status
 * code some frameworks (Laravel among them) repurpose, which most HTTP
 * clients and status-code switches do not special-case. `request()` below
 * treats it as a distinct, retryable-after-`refresh` condition rather than a
 * generic failure.
 */
export const DEFAULT_API_BASE = "https://user-api-v2.simplybook.me";

/** Every host the fetched OpenAPI document's `servers` array names. */
export const KNOWN_HOSTS = [
  "user-api-v2.simplybook.me",
  "user-api-v2.simplybook.it",
  "user-api-v2.simplybook.asia",
  "user-api-v2.simplybook.vip",
  "user-api-v2.simplybook.cc",
  "user-api-v2.simplybook.us",
  "user-api-v2.simplybook.pro",
  "user-api-v2.enterpriseappointments.com",
  "user-api-v2.simplybook.webnode.page",
  "user-api-v2.servicebookings.net",
  "user-api-v2.booking.names.uk",
  "user-api-v2.booking.lcn.uk",
  "user-api-v2.booking.register365.ie",
] as const;

/**
 * Validate and normalize a user-typed API base URL. Refuses anything that is
 * not one of the hosts SimplyBook.me's own OpenAPI document names — the
 * refusal happens here, with an explanation, rather than opaquely at the
 * sandbox's egress check (this app's `w6w.network.allow` lists exactly
 * {@link KNOWN_HOSTS}).
 */
export function normalizeApiBase(raw: string | undefined | null): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_API_BASE;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`"${raw}" is not a valid URL for the SimplyBook.me API base.`);
  }
  const host = url.hostname.toLowerCase();
  if (!(KNOWN_HOSTS as readonly string[]).includes(host)) {
    throw new Error(
      `"${raw}" is not one of the servers SimplyBook.me's API document publishes. Most accounts ` +
        `use the default ${DEFAULT_API_BASE}; Enterprise/white-label accounts are told their ` +
        "assigned host by SimplyBook.me support.",
    );
  }
  return `${url.protocol}//${host}`;
}

/** Public (redacted-safe) connection metadata set by `afterConnect`. */
export interface SimplybookConnectionDisplay {
  apiBase?: string;
  company?: string;
  login?: string;
}

/** Read the per-connection API host actions need — never the credential itself. */
export function apiBaseOf(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as SimplybookConnectionDisplay;
  return display.apiBase || DEFAULT_API_BASE;
}

export interface RequestOptions {
  method?: string;
  query?: Record<
    string,
    string | number | boolean | undefined | null | Array<string | number>
  >;
  body?: unknown;
}

/** Thrown for a non-2xx SimplyBook.me response; carries the vendor's own status/code. */
export class SimplybookError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "SimplybookError";
  }
}

interface SimplybookErrorBody {
  code?: number;
  message?: string;
  data?: unknown;
  message_data?: unknown;
}

/**
 * Read the error out of a failed response, using SimplyBook.me's flat
 * `{code, message, data, message_data}` shape when present and falling back
 * to the raw body otherwise (some endpoints answer plain text on failure).
 */
export async function describeError(
  res: Response,
  method: string,
  path: string,
): Promise<{ message: string; code: number | undefined }> {
  const text = await res.text().catch(() => "");
  let parsed: SimplybookErrorBody | undefined;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    // not JSON — fall through to the raw text below
  }
  const suffix = res.status === 419
    ? " (token expired — a fresh call should trigger `refresh`)"
    : "";
  const detail = parsed?.message ?? text;
  return {
    message:
      `SimplyBook.me ${res.status} ${res.statusText} for ${method} ${path}: ${detail}${suffix}`,
    code: parsed?.code,
  };
}

/**
 * Thin wrapper over `ctx.fetch` for the SimplyBook.me Admin API. Never sets
 * `X-Company-Login` / `X-Token` — the runtime routes every `ctx.fetch` call an
 * action makes through the auth `sign` hook, which injects both headers.
 */
export class SimplybookClient {
  constructor(private ctx: HookContext, private apiBase: string) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.apiBase}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(`${k}[]`, String(item));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const { message, code } = await describeError(res, method, url.pathname);
      throw new SimplybookError(res.status, code, message);
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}
