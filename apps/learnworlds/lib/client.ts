import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * LearnWorlds' REST API (v2) — verified against:
 *
 *   - The live authenticated OpenAPI document for the LearnWorlds workspace
 *     hosted at `learnworlds.dev` (Stoplight project `learnworlds/api:main/2951998` —
 *     the same project id embedded in `www.learnworlds.dev`'s own page source),
 *     cross-checked against `mock.stoplight.io` server metadata it declares.
 *   - A live, unsigned probe against a real production school
 *     (`academy.learnworlds.com`), which answered the exact documented error
 *     envelope for a missing `Lw-Client` header — `{"errors":[{"code":400,
 *     "context":"client_id","message":"Missing client_id or client cannot be
 *     found."}],"success":false}` — confirming the base path (`/admin/api/v2/…`)
 *     and the token endpoint (`/admin/api/oauth2/access_token`) are real and
 *     live, not aspirational documentation.
 *   - `support.learnworlds.com`'s own help-center articles ("LearnWorlds API
 *     documentation", "How to Request your API Keys and Access Tokens"), which
 *     confirm v1 is retired, credentials are requested per-school under
 *     Settings → Developers → API, and each school has its own "API URL" to
 *     copy from that same screen.
 *
 * **There is no vendor host.** LearnWorlds is multi-tenant SaaS, but every
 * customer ("school") gets its own subdomain (`yourschool.learnworlds.com`,
 * or a fully custom domain) and the API is served from THAT domain, not a
 * shared `api.learnworlds.com` gateway — there is no such gateway; requesting
 * one 302s to a "this school was deleted" page, because the docs' own example
 * host (`api.learnworlds.com`) was itself once a real (later-deleted) school
 * subdomain, not a placeholder for a fixed host. So the base URL is a
 * connection field and the egress allowlist is `["*"]`, the same posture this
 * pack uses for `mautic`, `gitea`, `bubble` and `tableau`.
 *
 * **Two headers, every request — one of them not `Authorization`.** Per the
 * spec's own "Required Headers for all requests" section, EVERY call (the
 * token exchange included) must carry both `Authorization: Bearer {token}`
 * AND `Lw-Client: {client_id}`. Miss the second one and you get the exact 400
 * shown above, not a 401 — a detail worth knowing before assuming a bad
 * request is a bad credential. Because `Lw-Client`'s value is itself part of
 * the credential (the OAuth client id), it is set by `sign` alongside
 * `Authorization`, never by an Action.
 */

/** Public (redacted-safe) connection metadata. */
export interface LearnWorldsConnectionDisplay {
  /** The school's own domain, e.g. `yourschool.learnworlds.com`. */
  schoolDomain?: string;
}

/**
 * Normalise a user-typed school domain into a bare origin.
 *
 * People paste `yourschool.learnworlds.com`, `https://yourschool.learnworlds.com/`,
 * or a fully custom domain with no `learnworlds.com` in it at all (LearnWorlds
 * supports connecting a custom domain to a school) — so no suffix is assumed
 * or enforced, only that it parses as a host.
 */
export function normalizeSchoolDomain(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("LearnWorlds school domain is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`LearnWorlds school domain is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`LearnWorlds school domain has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the school origin off the redacted Connection. Never touches the credential. */
export function schoolOriginFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as LearnWorldsConnectionDisplay;
  if (display.schoolDomain) return normalizeSchoolDomain(display.schoolDomain);
  throw new Error(
    "this LearnWorlds connection records no school domain — reconnect it so the domain can be stored",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

/** Drop keys the caller left unset so an edit does not overwrite untouched fields. */
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

/**
 * LearnWorlds' one documented error envelope:
 * `{"errors": [{"code": 400, "context": "…", "message": "…"}], "success": false}`.
 * A handful of endpoints instead answer a bare `{"error": "…"}` string (the
 * "resource not found" and "validation error" examples in the spec) — both
 * shapes are folded into one readable string, and the raw body is returned
 * verbatim if neither matches.
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as {
      errors?: Array<{ code?: number | string | null; context?: string | null; message?: string }>;
      error?: string;
    };
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors
        .map((e) => e.message ?? (e.context ? `${e.context}` : JSON.stringify(e)))
        .join("; ");
    }
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `Authorization` or `Lw-Client`
 * — the runtime routes every request through the auth `sign` hook, which
 * injects both from the credential.
 */
export class LearnWorldsClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = schoolOriginFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}/admin/api${path}`);
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
        `LearnWorlds ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
