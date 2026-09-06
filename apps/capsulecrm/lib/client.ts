import type { HookContext } from "@w6w/types";

/**
 * Capsule CRM's REST API v2 — verified against `developer.capsulecrm.com/v2`
 * (the vendor's own server-rendered reference, not a marketing shell) on
 * 2026-09-06: `overview/getting-started`, `overview/authentication`,
 * `overview/reading-from-the-api`, `overview/writing-to-the-api`,
 * `overview/handling-api-responses`, and the `operations/*` /`models/*` pages
 * for each resource this app touches.
 *
 * **Base URL is `api.capsulecrm.com/api/v2`** — NOT the doc host
 * (`developer.capsulecrm.com`), and note the `/api/` segment is doubled into
 * the path (`https://api.capsulecrm.com/api/v2/parties`, confirmed against
 * every worked `curl` example in the docs).
 *
 * ## Pagination
 *
 * Page-based, 1-indexed: `?page=N&perPage=M` (`perPage` capped at 100,
 * defaults to 50). The response also carries an RFC 5988 `Link` header with
 * `rel="next"`/`rel="prev"` entries — `nextPageFromLink` below reads the
 * `page` value back out of it so a workflow can loop without hand-rolling
 * page arithmetic, but `page`/`perPage` stay plain Action params since the
 * vendor's own params are exactly that simple.
 *
 * ## Rate limiting
 *
 * 4,000 requests/hour **per Capsule user** (the user the bearer token
 * belongs to, not per application). Every successful response carries
 * `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` (the
 * last a Unix epoch seconds timestamp) — read by `health/quota.ts`. A 429
 * uses a different, flatter error envelope than every other error status
 * (`{"error": "rate limit reached"}` rather than `{"message": ...}`).
 *
 * ## Error envelope
 *
 * 400/401/403/404/422 all share `{"message": "...", "errors"?: [{message,
 * resource, field}]}` (verified against the worked examples on
 * `overview/handling-api-responses`); 429 alone uses `{"error": "..."}`.
 * `errorMessage` below normalises across both.
 *
 * ## Long-running deletes
 *
 * Deleting a party or opportunity documents `204 No Content` as the normal
 * case, but the docs state Capsule "might schedule the deletion for later"
 * and answer `202 Accepted` with a `Location` header pointing at a
 * `/api/v2/jobs/{id}` resource instead. This app does not poll that job — a
 * `202` here is treated as "accepted", the same way this pack treats other
 * vendors' fire-and-forget queues, and the job-status endpoint is left
 * undocumented in this app's actions (out of scope; see README).
 */
export const API_URL = "https://api.capsulecrm.com/api/v2";

export interface CapsuleErrorDetail {
  message?: string;
  resource?: string;
  field?: string;
}

/**
 * Normalise Capsule's two documented error shapes to one readable string:
 * `{"message": "...", "errors": [{message, resource, field}]}` for most
 * 4xx responses, and the flatter `{"error": "rate limit reached"}` for a
 * 429. Falls back to the raw text when neither shape parses, so an
 * undocumented response body is never silently swallowed as "undefined".
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as {
      message?: string;
      error?: string;
      errors?: CapsuleErrorDetail[];
    };
    if (typeof body.error === "string") return body.error;
    const details = (body.errors ?? [])
      .map((e) => [e.field, e.message].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("; ");
    if (body.message && details) return `${body.message} (${details})`;
    if (body.message) return body.message;
    if (details) return details;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text;
}

/** Drop keys the caller left `undefined` so a PUT never nulls out an untouched field. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent, matching how every optional string param in this app behaves. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Pull the `page` query parameter out of the `Link` header's `rel="next"`
 * entry (RFC 5988). Returns `undefined` on the last page, or when the header
 * is absent — the vendor never states a total-pages count, so "no next link"
 * is the only signal a caller gets that a listing has ended.
 */
export function nextPageFromLink(header: string | null): number | undefined {
  if (!header) return undefined;
  for (const part of header.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (!m) continue;
    const page = new URL(m[1]).searchParams.get("page");
    return page ? Number(page) : undefined;
  }
  return undefined;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

export interface CapsuleResult<T> {
  data: T;
  /** Next page number from the `Link` header, when this response was paginated. */
  nextPage?: number;
  /** The HTTP status Capsule actually answered with — 200/201 vs. the documented "might defer to
   * a job" 202 on a delete are both `res.ok`, so callers that care (e.g. `party-delete`) read this. */
  status: number;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which is the only code
 * handed the credential.
 */
export class CapsuleClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<CapsuleResult<T>> {
    const url = new URL(`${API_URL}${path}`);
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
    const text = await res.text();
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `Capsule ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    const data = text ? (JSON.parse(text) as T) : (undefined as T);
    return { data, nextPage: nextPageFromLink(res.headers.get("link")), status: res.status };
  }
}
