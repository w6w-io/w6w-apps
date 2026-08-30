import type { HookContext } from "@w6w/types";

/**
 * Teachable Public API v1 REST client.
 *
 * Verified 2026-08-30 against the OpenAPI 3.0.2 document Teachable's own
 * Readme.io-hosted reference embeds per-page (`docs.teachable.com/reference`,
 * `info.title` `teachable-public-api`, `info.version` `0.0.1`), plus live
 * probes against `developers.teachable.com` and the vendor's own prose guides
 * (`docs.teachable.com/docs/authentication`, `.../rate-limits`,
 * `.../pagination`).
 *
 * ## The real base host is not the docs host
 *
 * The docs live at `docs.teachable.com`; the API itself is
 * `https://developers.teachable.com` (the OpenAPI document's only declared
 * `server`, confirmed live — an unauthenticated `GET /v1/courses` there answers
 * `401` from a Kong gateway, not a 404 or an SPA shell).
 *
 * ## The credential header is literally named `apiKey`
 *
 * Not `Authorization`, not a bearer prefix. The security scheme is
 * `{"type": "apiKey", "in": "header", "name": "apiKey"}`, and the auth guide
 * shows exactly `apiKey: YOURKEYHERE`. See `auth/api-key.ts`.
 *
 * ## Two ways to fail auth, two different bodies
 *
 * Measured live: no header at all answers
 * `{"message": "No API key found in request"}`; a syntactically-present but
 * wrong key answers `{"message": "Invalid authentication credentials"}`. Both
 * are HTTP 401 — the body, not the status, is what tells them apart.
 *
 * ## Rate limit: 100/min per school, but the vendor's own example is wrong
 *
 * The rate-limits guide states the limit is "100 requests per minute for every
 * school", then shows an *example* 429 response with `RateLimit-Limit: 360` —
 * a documented inconsistency, not a typo this client should paper over. Read
 * `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` off the wire rather
 * than trusting either number; see `health/quota.ts`.
 *
 * ## Pagination default is *also* inconsistent between the guide and the spec
 *
 * The pagination guide says the default page size is 25; the OpenAPI
 * `description` on `/v1/courses`' own `per` parameter says "when not defined
 * the maximum is 20", and `/v1/pricing_plans` says 5. This client never
 * silently relies on a vendor default — every paginated action prefills `per`
 * explicitly (see `lib/params.ts`) so what a workflow gets does not depend on
 * which of the two numbers is actually live today.
 *
 * ## Webhooks are read-only through this API
 *
 * The spec has no `POST /v1/webhooks` — only `GET /v1/webhooks` and
 * `GET /v1/webhooks/{id}/events`. A webhook is created and edited in the
 * school admin UI; this app can only read what is already configured there.
 *
 * ## Errors
 *
 * Every failure body is `{"message": string | string[], "request_id"?: string}`
 * — `message` is sometimes an array of validation lines, not always a single
 * string, per the `ErrorResponse` schema's own `oneOf`.
 */

export const API_BASE = "https://developers.teachable.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface TeachableErrorBody {
  message?: string | string[];
  request_id?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive; they are meaningful. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** `message` is a string OR an array of strings (`ErrorResponse.message`'s `oneOf`). */
export function flattenMessage(message: string | string[] | undefined): string | undefined {
  if (message === undefined) return undefined;
  return Array.isArray(message) ? message.join("; ") : message;
}

/**
 * Turn Teachable's error body into one actionable line.
 *
 * `request_id` is kept when present — it is the value Teachable's own support
 * asks for when troubleshooting a failed call.
 */
export function formatTeachableError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TeachableErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TeachableErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = flattenMessage(parsed?.message);
  if (!message) return `Teachable ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Teachable ${status} for ${method} ${path}: ${message}`,
    parsed?.request_id ? `request_id ${parsed.request_id}` : undefined,
    status === 429
      ? "rate-limited (100 requests/minute per school); retry after the wait named in " +
        "the RateLimit-Reset header"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(" — "), 1000);
}

export class TeachableClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body. Every successful Teachable response is a JSON object. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the 204-on-success endpoints (mark-complete, enroll, unenroll). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
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
      const detail = await res.text().catch(() => "");
      throw new Error(formatTeachableError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
