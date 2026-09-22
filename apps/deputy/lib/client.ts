import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Deputy's V1 API — the base path, URL handling and the shared client.
 *
 * Everything here was read off Deputy's own developer documentation on
 * 2026-09-22 (`https://developer.deputy.com/`; append `.md` to any page for its
 * clean markdown, and `/llms.txt` for the full page index), cross-checked with
 * live, unauthenticated probes against the install Deputy's own guides use as
 * their example, `simonssambos.au.deputy.com`.
 *
 * ## There is no vendor host — every customer gets their own subdomain
 *
 * Deputy's "Getting Started" page says it outright: *"Every Deputy customer
 * runs on their own subdomain … if the customers install is
 * https://simonssambos.au.deputy.com then the api endpoint is
 * https://simonssambos.au.deputy.com/api/"*, and "Using a Permanent Token"
 * names the four regions a URL can carry: AU, EU, UK and US. So the base URL is
 * a Connection field and the manifest's egress allowlist is `["*"]` — the same
 * posture this pack already uses for `mautic`, `gitea`, `tableau` and `bubble`,
 * and the price of an app whose server address only the operator knows.
 *
 * A URL that is not an install is not a 404: `example.au.deputy.com` (verified
 * live) answers `302` to `https://once.deputy.com/my/`. The client never
 * follows that silently into a "success" — see `auth/permanent-token.ts`'s
 * `test`, which reads the final URL and the body rather than the status alone.
 *
 * ## V1 is the documented, stable surface — and it says so
 *
 * The generated reference calls itself *"Generated, comprehensive reference for
 * Deputy's legacy V1 `/resource/{Object}` API"* and adds *"V1 is in maintenance
 * mode — new integrations should prefer the V2 API."* This app deliberately
 * stays on V1: V2 is documented as a different, partly async, partly
 * PKCE-authenticated surface (`/api/v2/...`) that a permanent token is not the
 * right credential for, and the `/resource/{Object}` surface still covers the
 * scheduling, timesheet and employee objects a workflow actually moves. The
 * README records V2 as a known gap rather than hiding it.
 *
 * ## Two response shapes, one error shape
 *
 * Every `/resource/{Object}` read answers a **bare JSON array** (`GET
 * /resource/Employee` → `[ {Employee}, … ]`), not an envelope — there is no
 * `{data, total}` wrapper to unwrap, and `INFO`/`QUERY`/create/update answer a
 * single object or array of the same schema. A failure answers either
 * `{"error":{"code":403,"message":"No authorization given"}}` (observed live
 * with no `Authorization` header) or `{"error":"invalid_request"}` (observed
 * live with a header present but empty). `errorMessage` reads both.
 */
export const API_PATH = "/api/v1";

/**
 * Deputy's documented per-response cap: *"The maximum amount of records
 * included in a single response is 500"* — also stated as `max`'s
 * `maximum: 500` in the QUERY payload schema. It is a server-side ceiling, not
 * a page size this app chose.
 */
export const MAX_PAGE_SIZE = 500;

/** Public (redacted-safe) connection metadata. */
export interface DeputyConnectionDisplay {
  /** The install origin, e.g. `https://simonssambos.au.deputy.com`. */
  baseUrl?: string;
  /** The install name from the host, e.g. `simonssambos`. */
  install?: string;
  /** The region from the host — `au`, `eu`, `uk`, `na`/`us`. */
  region?: string;
}

/**
 * Normalise a user-typed install URL into a bare origin.
 *
 * People paste `simonssambos.au.deputy.com`, the same with a trailing slash,
 * and — because Deputy's own examples are written as
 * `https://{install}.{geo}.deputy.com/api/v1/me` — a URL that already carries
 * `/api`, `/api/v1` or the full `/api/v1/me` probe path. All three are stripped
 * so a pasted example does not become `…/api/v1/api/v1/me`.
 *
 * A missing scheme defaults to `https`: a permanent token in flight deserves
 * TLS, and turning a bare hostname into `http://` would silently downgrade the
 * credential's transport. An operator on a private network can still type
 * `http://` explicitly.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Deputy install URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Deputy install URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Deputy install URL has no host: ${trimmed}`);
  const path = url.pathname.replace(/\/+$/, "").replace(/\/api(\/v\d+)?(\/me)?$/i, "");
  return `${url.protocol}//${url.host}${path}`;
}

/** Read the install origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as DeputyConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Deputy connection records no install URL — reconnect it so the URL can be stored",
  );
}

/**
 * Split `simonssambos.au.deputy.com` into its install name and region.
 *
 * Purely structural — no network call, so `afterConnect` can label a Connection
 * without asking Deputy anything. Deputy documents the shape as
 * `{install}.{geo}.deputy.com`, with `{geo}` one of `au`, `eu`, `uk`, `us`
 * ("Using a Permanent Token") — plus the `na` the generated OpenAPI server
 * template lists alongside them. Anything that does not match that shape is
 * left unlabelled rather than guessed at.
 */
export function parseInstall(baseUrl: string): { install?: string; region?: string } {
  let host: string;
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return {};
  }
  const labels = host.split(".");
  if (labels.length < 3) return {};
  if (labels.at(-2) !== "deputy" || labels.at(-1) !== "com") return {};
  const rest = labels.slice(0, -2);
  if (rest.length === 0) return {};
  if (rest.length === 1) return { install: rest[0] };
  return { install: rest[0], region: rest.at(-1) };
}

/** Lowercased hostname of a URL, or `""` when it cannot be parsed. */
export function host(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Do two URLs address the same host? Used to notice a redirect off an install. */
export function sameHost(a: string, b: string): boolean {
  const ha = host(a);
  return !!ha && ha === host(b);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a partial update does not blank a field. */
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

/** Accept a `json` param as either an already-parsed value or a JSON string. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Read Deputy's own error text out of a failed response body.
 *
 * Deputy's documented-and-observed failure envelope is
 * `{"error":{"code":403,"message":"No authorization given"}}`; a malformed
 * request answers the flatter `{"error":"invalid_request"}`. Both are folded
 * into a readable string, and the raw body is returned verbatim if neither
 * shape matches — a proxy or login page answering 200 HTML must not turn into
 * the string `"undefined"`.
 *
 * Only Deputy's own `message`/`error` text is surfaced: a response body is
 * never echoed wholesale into an action error or a health message, because
 * that is exactly where a credential would end up if a vendor ever echoed one.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as { error?: unknown; message?: unknown };
    const err = body?.error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const e = err as { code?: number; message?: string };
      if (typeof e.message === "string" && e.message) {
        return e.code ? `${e.message} (${e.code})` : e.message;
      }
    }
    if (typeof body?.message === "string" && body.message) return body.message;
  } catch {
    // Not JSON — fall through to the raw text, truncated to something readable.
  }
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

/** The one endpoint shape repeated for every resource: `/resource/{Object}...`. */
export function resourcePath(object: string, suffix?: string | number): string {
  const tail = suffix === undefined ? "" : `/${encodeURIComponent(String(suffix))}`;
  return `/resource/${object}${tail}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Authorization: Bearer {permanent token}`.
 */
export class DeputyClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) { for (const item of v) url.searchParams.append(k, String(item)); }
      else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `Deputy ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // A 200 that is not JSON means something answered in front of Deputy —
      // a proxy, a login page, an SSO interstitial. Say so instead of leaking
      // an unparsable body upward as a generic SyntaxError.
      throw new Error(
        `Deputy answered ${init.method} ${url.pathname} with 200 but not JSON — ` +
          `is a proxy or login page in the way? (got ${
            res.headers.get("content-type") ?? "no content-type"
          })`,
      );
    }
  }

  /** `GET /api/v1/me` — the "Who Am I" endpoint Deputy's auth docs validate a token with. */
  me<T = unknown>(): Promise<T> {
    return this.request<T>("/me");
  }

  /** `GET /resource/{Object}` — every matching record, capped at 500 by the server. */
  list<T = unknown>(object: string): Promise<T[]> {
    return this.request<T[]>(resourcePath(object));
  }

  /** `GET /resource/{Object}/{id}` — one record. */
  get<T = unknown>(object: string, id: string | number): Promise<T> {
    return this.request<T>(resourcePath(object, id));
  }

  /** `GET /resource/{Object}/INFO` — the resource's field metadata. */
  info<T = unknown>(object: string): Promise<T> {
    return this.request<T>(`${resourcePath(object)}/INFO`);
  }

  /** `POST /resource/{Object}/QUERY` — the documented filter/sort/join read. */
  query<T = unknown>(object: string, body: Record<string, unknown>): Promise<T[]> {
    return this.request<T[]>(`${resourcePath(object)}/QUERY`, { method: "POST", body });
  }

  /** `POST /resource/{Object}` — create. */
  create<T = unknown>(object: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(resourcePath(object), { method: "POST", body });
  }

  /** `POST /resource/{Object}/{id}` — update (V1 has no PATCH; only sent fields are touched). */
  update<T = unknown>(
    object: string,
    id: string | number,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(resourcePath(object, id), { method: "POST", body });
  }

  /** `POST /supervise/{path}` — the documented clock-on/off/update timesheet calls. */
  supervise<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(`/supervise/${path}`, { method: "POST", body });
  }
}
