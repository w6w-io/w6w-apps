import type { HookContext } from "@w6w/types";

/**
 * OpusClip Clip API REST client.
 *
 * Verified on 2026-09-05 against OpusClip's own machine-readable OpenAPI 3.0
 * document (`help.opus.pro/api-reference/openapi.json`, 103,310 bytes,
 * `info.title` "Clip API", `info.version` "1.0") plus live probes against
 * `api.opus.pro`. Nothing here came from a third-party integration directory.
 *
 * ## One host, no versioned prefix
 *
 * The OpenAPI document declares exactly one server, `https://api.opus.pro`,
 * and every documented path already carries its own `/api/...` segment (there
 * is no separate `/v1`/`/v2` prefix to add).
 *
 * ## Auth is `Authorization: Bearer <key>`
 *
 * `components.securitySchemes.bearer` is `{ scheme: "bearer", bearerFormat:
 * "JWT", type: "http" }`, and every operation requires it (`security: [{
 * bearer: [] }]`). The dashboard calls the credential an "API key" (`sk-...`,
 * per the webhook-signing docs), but on the wire it is a bearer token like any
 * other. A handful of the docs' own curl examples drop the `Bearer ` prefix or
 * the header's colon (typos, confirmed against the OpenAPI security scheme and
 * against every *other* documented example, which does include it) — this app
 * always sends the documented `Bearer ` form.
 *
 * ## Two response shapes, not one — and an undocumented plain-text error
 *
 * Roughly half the endpoints (social posting, collections, collection
 * contents) wrap their payload in `{"data": ...}`. The other half — clip
 * projects, exportable clips, brand templates, censor jobs, and generative
 * jobs — answer the **bare resource**, with no envelope at all. Both shapes
 * are read off each operation's own `responses` schema in the OpenAPI
 * document; nothing here is guessed. See {@link OpusClipClient.data} (unwraps)
 * vs {@link OpusClipClient.json} (does not).
 *
 * Errors are not uniform either. Live probes against `GET /api/social-accounts`
 * on 2026-09-05 (no `Authorization` header, and again with a syntactically
 * plausible but fake bearer token) both answered `401` with
 * `content-type: text/plain` and a body that is literally the 12-byte string
 * `Unauthorized` — not JSON, and not the `{errorName, errorMessage}` shape the
 * OpenAPI document uses for `POST /api/collections` (402/`QuotaExceed`) and
 * `GET /api/collections` (400). {@link formatOpusError} parses opportunistically
 * and falls back to the raw text so a plain-text 401 still produces a readable
 * message instead of a JSON-parse crash.
 *
 * ## The monthly cap answers with its own third shape
 *
 * Per `Limitations` (`help.opus.pro/api-reference/limitation`), a workspace
 * that has used its 900-credit/15-hour monthly allowance gets `403` — not
 * `429` — with `{"code": "API_MONTHLY_CAP_REACHED", "reset_at": "...",
 * "upgrade_url": "..."}` so retry-on-429 agent loops don't spin. This is
 * distinguished from an ordinary 403 by `code`, which `formatOpusError` reads.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.opus.pro";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue> | Record<string, unknown>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers beyond `accept`/`content-type` (e.g. `x-opus-org-id`). */
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

interface OpusMonthlyCapError {
  code?: string;
  reset_at?: string;
  upgrade_url?: string;
}

interface OpusFieldError {
  errorName?: string;
  errorMessage?: string;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn an OpusClip error response into one actionable line.
 *
 * Tries, in order: the monthly-cap shape (`code === "API_MONTHLY_CAP_REACHED"`),
 * the `{errorName, errorMessage}` shape the OpenAPI document uses for
 * collection errors, then falls back to the raw body verbatim — which is what
 * a plain-text `401 Unauthorized` needs, since it is not JSON at all.
 */
export function formatOpusError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (OpusMonthlyCapError & OpusFieldError) | null = null;
  try {
    parsed = JSON.parse(raw) as OpusMonthlyCapError & OpusFieldError;
  } catch {
    parsed = null;
  }

  if (parsed?.code === "API_MONTHLY_CAP_REACHED") {
    return `OpusClip ${status} API_MONTHLY_CAP_REACHED for ${method} ${path}: monthly API cap ` +
      `reached${parsed.reset_at ? `, resets ${parsed.reset_at}` : ""}${
        parsed.upgrade_url ? ` (${parsed.upgrade_url})` : ""
      }`;
  }
  if (parsed?.errorName) {
    return `OpusClip ${status} ${parsed.errorName} for ${method} ${path}` +
      (parsed.errorMessage ? `: ${parsed.errorMessage}` : "");
  }
  if (status === 429) {
    return `OpusClip 429 for ${method} ${path}: rate or concurrency limit hit; back off and retry`;
  }

  const trimmed = raw.trim();
  return `OpusClip ${status} for ${method} ${path}${trimmed ? `: ${truncate(trimmed)}` : ""}`;
}

export class OpusClipClient {
  constructor(private ctx: HookContext) {}

  /** `{"data": ...}` in, `data` out — the shape used by roughly half the API. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.json<{ data?: T }>(path, options);
    return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
  }

  /**
   * Parse the body without unwrapping — the shape used by clip projects,
   * exportable clips, brand templates, censor jobs, and generative jobs, all
   * of which answer the bare resource with no `data` envelope.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      ...options.headers,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatOpusError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
