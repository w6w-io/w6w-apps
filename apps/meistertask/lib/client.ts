import type { HookContext } from "@w6w/types";

/**
 * MeisterTask REST API client.
 *
 * Verified 2026-09-05 against the vendor's own OpenAPI 3.1 document — embedded
 * server-side-rendered in every `developers.meistertask.com/reference/*` page
 * (`document.api.schema` in the page's `ssr-props` script) — plus live probes
 * against `www.meistertask.com` and `status.meistertask.com`. Nothing here
 * came from a third-party integration directory.
 *
 * ## One host, no envelope
 *
 * The OpenAPI document declares exactly one server,
 * `https://www.meistertask.com/api`. Every response is the resource itself —
 * a bare JSON object or array — never wrapped in a `data` envelope the way
 * Asana or Apify do. A `DELETE` answers `204` with an empty body.
 *
 * ## Two error envelopes, not one — verified live, not just in the docs
 *
 * The vendor's error-handling reference page shows exactly one shape,
 * `{"errors": [{"message", "status"}, ...]}`, and that is what every
 * validation/not-found/forbidden response actually answers (400/403/404,
 * checked against several resources).
 *
 * **A `401` is different, and the docs never show one.** Live probes against
 * `GET /persons/me` on 2026-09-05 — no token, and a syntactically-plausible
 * bogus token — both answered `{"error": {"code": 401, "message": "Invalid
 * credentials"}}`: a *singular* `error` object, not the documented plural
 * array. It is the same shape the OpenAPI document's own Attachment examples
 * use (the only place a 401 example appears anywhere in the spec), which
 * means the singular form is not an Attachment-specific quirk but this
 * API's actual authentication-layer error shape — MindMeister's shared auth
 * backend answers differently than MeisterTask's own resource controllers.
 * {@link formatMeisterTaskError} parses both.
 *
 * ## Countless pagination
 *
 * `items` (page size, default 50, max 500) and `page` (1-based) control
 * paging. The vendor's own name for this is "countless pagination": **no
 * response carries a total count**, in the body or in a header — only a
 * `Link` header (RFC 8288), `Current-Page` and `Page-Items`. A workflow that
 * needs "how many are there" has to walk pages until an empty one comes back.
 *
 * ## Sorting
 *
 * `sort` takes one or more attribute names, comma-separated, each optionally
 * prefixed with `-` for descending (`sort=updated_at,-name`). An unknown
 * attribute is silently ignored rather than rejected — the vendor's own
 * documented behaviour, not a guess.
 *
 * ## Rate limiting
 *
 * 120 requests per 60 seconds. Exceeding it doesn't just 429 the one request —
 * the vendor **blocks the client for 180 seconds**. No rate-limit headers of
 * any kind are documented, so there is nothing to read in advance; see
 * `health/rate-limit.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://www.meistertask.com/api";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. Omit for a bodyless GET/DELETE. */
  body?: Record<string, unknown>;
}

interface MeisterTaskErrorItem {
  message?: string;
  status?: number;
}

/** The documented shape: `{"errors": [...]}`. What 400/403/404 actually answer. */
interface MeisterTaskErrorsEnvelope {
  errors?: MeisterTaskErrorItem[];
}

/**
 * The undocumented shape a `401` actually answers:
 * `{"error": {"code", "message"}}` — singular, verified live 2026-09-05.
 * See the module comment for why this is not an Attachment-only quirk.
 */
interface MeisterTaskSingularErrorEnvelope {
  error?: { code?: number; message?: string };
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can carry several entries. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn MeisterTask's error body into one actionable line.
 *
 * Tries the documented plural `{"errors": [...]}` shape first — a single
 * response can carry more than one problem, so every entry is kept — then
 * falls back to the singular `{"error": {...}}` shape a `401` actually
 * answers with. See the module comment for both.
 */
export function formatMeisterTaskError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (MeisterTaskErrorsEnvelope & MeisterTaskSingularErrorEnvelope) | null = null;
  try {
    parsed = JSON.parse(raw) as MeisterTaskErrorsEnvelope & MeisterTaskSingularErrorEnvelope;
  } catch { /* not JSON — fall through to the raw body */ }

  const items = parsed?.errors;
  if (items && items.length > 0) {
    const messages = items.map((e) => e.message ?? `HTTP ${e.status ?? status}`).join("; ");
    return truncate(`MeisterTask ${status} for ${method} ${path}: ${messages}`, 1000);
  }

  const single = parsed?.error;
  if (single?.message) {
    return truncate(`MeisterTask ${status} for ${method} ${path}: ${single.message}`, 1000);
  }

  return `MeisterTask ${status} for ${method} ${path}: ${truncate(raw)}`;
}

export class MeisterTaskClient {
  constructor(private ctx: HookContext) {}

  /** Parses the JSON body. Use for every endpoint except a bare `204` delete. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the `DELETE` endpoints that answer `204` with no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, String(v));
    }

    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatMeisterTaskError(res.status, method, url.pathname, detail));
    }
    return res;
  }
}
