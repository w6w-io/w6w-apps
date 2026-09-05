import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Recruitee API v1 client (`api.recruitee.com`, `/c/{company_id}/...`).
 *
 * ## The published reference is NOT a curated public-API doc
 *
 * `apidocs.recruitee.com` (the page the app-candidate catalog links to, via a
 * client-side redirect off `api.recruitee.com/docs/index.html`) is an
 * `rspec_api_documentation`-generated dump of Recruitee's entire Rails
 * application's request specs — 951 documented actions across 247 resource
 * groups, fetched and parsed in full on 2026-09-05. It includes things a
 * third-party integration can never call: `Admin.Web.Admin` (`GET /admin`
 * itself is documented as HTTP Basic auth with an account **email + password**),
 * `Billing.Web.*`, `GDPR.Web.*`, the whole `Referral.Portal.Web.*` surface, and
 * `POST /c/{company_id}/oauth/personal_tokens` (which *mints* the token this
 * app uses — called from a signed-in browser session, never by this app).
 * There is no marker in the document distinguishing those from the resources a
 * personal API token can actually reach.
 *
 * So nothing here was taken on the document's authority alone. Every resource
 * this client calls was cross-checked live against `api.recruitee.com`:
 * unauthenticated and with a syntactically-plausible bad token, both against
 * `GET /c/{id}/candidates` and against the company-scoped `GET /c/{id}/admin`
 * whoami. Both answered the *same* RFC 6750 bearer challenge
 * (`www-authenticate: Bearer realm="recruitee"`, then
 * `error="invalid_token", error_description="Token not found."` — no cookie,
 * no CSRF token, no basic-auth prompt), which is the evidence that these
 * particular paths are reachable with nothing but a personal API token. Only
 * that subset is implemented: Candidates, Offers, Departments, Notes, Tasks,
 * Tags, and Placements (list + change stage).
 *
 * ## One host, company-scoped paths
 *
 * Every documented resource except account creation itself lives under
 * `/c/{company_id}/...`. The company id is not a secret — it is the numeric id
 * visible in the account's own Recruitee URL — but it is still per-account
 * configuration the API cannot work without, so it is collected once at
 * connect time (see `auth/api-token.ts`) and read off the Connection's display
 * data here, the same way `packages/apps/apps/freshdesk` reads its `domain`.
 *
 * ## The error envelope has two shapes, and `error` itself has two
 *
 * A 401 from a missing/bad token answers `{"error": "Token not found.",
 * "error_code": "invalid_token"}` — `error` a bare string (measured live).
 * Validation failures (422) and plain 403/404s answer `{"error": ["Forbidden"]}`
 * or `{"error": [...], "error_fields": {field: [...]}}` — `error` an array of
 * strings (from the vendor's own documented examples). Both are read by
 * {@link formatRecruiteeError} rather than assuming one shape and rendering
 * `[object Object]` for the other.
 */

export const API_BASE = "https://api.recruitee.com";

/** Read the company id `afterConnect` recorded on the Connection's display data. */
export function companyIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { companyId?: string | number };
  const id = display.companyId;
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new Error(
      "Recruitee connection has no Company ID — reconnect the account so it can be recorded.",
    );
  }
  return String(id).trim();
}

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface RecruiteeErrorBody {
  error?: string | string[];
  error_code?: string | null;
  error_fields?: Record<string, string[]>;
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 1000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Recruitee's error body into one actionable line, handling both the
 * bare-string and array-of-strings forms `error` takes on the wire.
 */
export function formatRecruiteeError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: RecruiteeErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as RecruiteeErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || parsed.error === undefined) {
    return `Recruitee ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const message = Array.isArray(parsed.error) ? parsed.error.join("; ") : parsed.error;
  const fieldNotes = parsed.error_fields
    ? Object.entries(parsed.error_fields)
      .map(([field, msgs]) => `${field} ${msgs.join(", ")}`)
      .join("; ")
    : undefined;

  const parts = [
    `Recruitee ${status}${parsed.error_code ? ` ${parsed.error_code}` : ""} for ${method} ${path}`,
    message,
    fieldNotes,
  ].filter(Boolean);
  return truncate(parts.join(": "));
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render a boolean query parameter the way Recruitee's own docs describe one:
 * "should be string 'true' or '1'". Nothing documents what a literal `false`
 * does, so — as with Apify elsewhere in this pack — a `false`/unset value is
 * expressed as absence, which is also the documented default for every
 * boolean flag this app exposes.
 */
export function flag(v: boolean | undefined): string | undefined {
  return v === true ? "true" : undefined;
}

/** Normalise a comma-separated or array form field into a string list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Normalise a comma-separated, string-array or number-array form field into a number list. */
export function toNumberList(
  v: number[] | string[] | string | undefined | null,
): number[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (Array.isArray(v) && v.every((x) => typeof x === "number")) {
    return v.length ? v : undefined;
  }
  const list = toList(v as string[] | string);
  return list?.map((s) => Number(s)).filter((n) => Number.isFinite(n));
}

export class RecruiteeClient {
  private companyId: string;

  constructor(private ctx: HookContext) {
    this.companyId = companyIdFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}/c/${encodeURIComponent(this.companyId)}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
      throw new Error(
        formatRecruiteeError(res.status, init.method ?? "GET", url.pathname, text),
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
