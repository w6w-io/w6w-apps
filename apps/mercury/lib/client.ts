import type { HookContext } from "@w6w/types";

/**
 * Mercury API REST client (`api.mercury.com/api/v1`).
 *
 * Every path, verb, query parameter, and request/response field in this app
 * was verified on 2026-09-05 against Mercury's own machine-readable OpenAPI
 * document — embedded verbatim (all 74 paths, `info.title` "Mercury API",
 * `servers[0].url` "https://api.mercury.com/api/v1") inside the `ssr-props`
 * hydration payload of every page at `docs.mercury.com/reference/*`, a
 * ReadMe-hosted reference confirmed live the same day — plus live probes
 * against `api.mercury.com`. Nothing here came from a third-party
 * integration directory.
 *
 * ## The response envelope is not uniform
 *
 * List endpoints answer `{ <resource>: [...], page: { nextPage, previousPage } }`
 * — the array key varies per resource (`accounts`, `cards`, `categories`,
 * `recipients`, `customers`, `invoices`, `webhooks`, `users`), never a fixed
 * `items`/`data` wrapper. Each action's `execute` reads its own key and
 * re-presents it as `{ items, nextPage, previousPage }` for a consistent shape
 * regardless.
 *
 * ## Two distinct error shapes
 *
 * - **Auth failures** answer `{"errors":{"errorCode": "...", "message": "..."}}`
 *   — verified live: a missing `Authorization` header answers
 *   `noAuthTokenHeader`, an unrecognised bearer answers `noTokenInDB`, both
 *   `401`.
 * - **Validation / not-found failures** answer the same envelope shape with a
 *   different `errorCode` (e.g. `validationError`, `notFound`) and sometimes a
 *   `details` array.
 *
 * {@link formatMercuryError} surfaces whichever shape is present rather than
 * collapsing both to "HTTP 400".
 */

/** Verified live 2026-09-05 (`servers[0].url` in the vendor's own OpenAPI document). */
export const API_BASE = "https://api.mercury.com/api/v1";

export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON. */
  body?: unknown;
  /** Set when the response is a binary download (PDF) rather than JSON. */
  raw?: boolean;
}

interface MercuryErrorBody {
  errors?: {
    errorCode?: string;
    message?: string;
    details?: unknown;
  };
}

/** Drop unset keys; repeat a key for each array element (Mercury's own convention, e.g. `?cardId=a&cardId=b`). */
function appendQuery(url: URL, query: Record<string, QueryValue>): void {
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null) url.searchParams.append(k, String(item));
      }
    } else {
      url.searchParams.set(k, String(v));
    }
  }
}

/** Keep an error message readable. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Turn a Mercury error body into one actionable line. */
export function formatMercuryError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: MercuryErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as MercuryErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.errors;
  if (err?.errorCode || err?.message) {
    const detail = [err.errorCode, err.message].filter(Boolean).join(": ");
    return truncate(`Mercury ${status} for ${method} ${path}: ${detail}`);
  }
  return truncate(`Mercury ${status} for ${method} ${path}: ${raw}`);
}

/**
 * Accept a `json`-typed param as either a parsed value or the string a user
 * typed into a text field.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export class MercuryClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** For a binary (PDF) response. Never JSON-parses the body. */
  raw(path: string, options: RequestOptions = {}): Promise<Response> {
    return this.send(path, { ...options, raw: true });
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    if (options.query) appendQuery(url, options.query);

    const headers: Record<string, string> = { accept: options.raw ? "*/*" : "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatMercuryError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
