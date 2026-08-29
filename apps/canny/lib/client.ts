import type { HookContext } from "@w6w/types";

/**
 * Canny REST API — `https://canny.io/api`.
 *
 * Every path, argument and response field in this app was read off Canny's own
 * generated API reference at `developers.canny.io/api-reference` (verified
 * 2026-08-29, fetched from its `DevelopersBundle`/chunk JS — the page is a
 * client-rendered SPA with no static HTML, so the reference content lives in
 * `https://assets.canny.io/<hash>/5024.js`), cross-checked with live probes
 * against `canny.io` on the same day. Nothing here came from a third-party
 * integration directory.
 *
 * ## One host, two API versions, no path prefix beyond `/api/vN`
 *
 * Every endpoint is `POST https://canny.io/api/v1/<resource>/<method>` or
 * `.../api/v2/<resource>/<method>` for the five endpoints Canny has migrated to
 * cursor pagination (`comments/list`, `companies/list`, `status_changes/list`,
 * `users/list`, `votes/list`). There is no regional host and no sandbox
 * environment.
 *
 * ## Authentication is a JSON BODY field, never a header
 *
 * Canny's own docs: "You can include your secret API key in a request by
 * adding it as a POST parameter with key apiKey." Live-verified 2026-08-29:
 * `POST /api/v1/boards/list` with no `Authorization` header and an `apiKey`
 * field in a JSON body (`Content-Type: application/json`) is accepted exactly
 * like the form-encoded (`-d apiKey=...`) form Canny's curl examples show —
 * both are POST body fields, just two different encodings of the same body.
 * This client always sends JSON, because several endpoints take nested
 * objects and arrays (`customFields`, `companies`, `tagIDs`) that have no
 * documented form-encoding. `apiKey` is never set here — see
 * `../auth/api-key.ts`, the only place the credential is touched.
 *
 * ## Errors
 *
 * Every failure observed — live-probed with a bogus key, and every
 * "Example Response" for an invalid id/parameter across the reference —
 * is `{"error": "<message>"}` on a 4xx status. There is no machine-stable
 * error `type`/`code` field the way Apify or Mandrill expose one; the message
 * itself is the only detail Canny gives, so {@link formatCannyError} carries
 * it verbatim rather than inventing a taxonomy Canny doesn't have.
 *
 * ## No documented rate limit
 *
 * Canny publishes no rate-limit headers (confirmed: none present on either a
 * successful or a rejected live request) and no numeric budget in its docs.
 * This app declares no `quota` health check as a result — there is nothing to
 * read.
 */

/** No other server is documented; every path below is appended to this. */
export const API_BASE = "https://canny.io/api";

export interface CannyErrorBody {
  error?: string;
}

/**
 * Turn Canny's one error shape into a readable line. Canny gives no stable
 * error `code`, so the vendor's own message is the whole story — never
 * discarded in favour of a generic "HTTP 400".
 */
export function formatCannyError(
  status: number,
  path: string,
  raw: string,
): string {
  let parsed: CannyErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as CannyErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.error;
  if (message) return `Canny ${status} for ${path}: ${message}`;
  return `Canny ${status} for ${path}: ${truncate(raw)}`;
}

export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Drop keys the caller left unset, so an optional field a user didn't fill in
 * is simply absent from the JSON body rather than sent as `null`/`""` — Canny
 * documents several fields (e.g. `posts/update`'s `title`) as "only change
 * this if provided", and an explicit empty string would blank them out.
 *
 * `false` and `0` survive: `etaPublic: false` and `monthlySpend: 0` are both
 * meaningful values, not absence.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/`array` param into a plain string array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed —
 * the host hands a `json`-typed param through in whichever shape it arrived.
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

export class CannyClient {
  constructor(private ctx: HookContext, private version: "v1" | "v2" = "v1") {}

  /**
   * POST `<API_BASE>/<version>/<path>` with `params` as the JSON body.
   * `apiKey` is injected by the `sign` hook, never here.
   */
  async post<T = unknown>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = `${API_BASE}/${this.version}${path}`;
    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(compact(params)),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatCannyError(res.status, path, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * For the endpoints whose whole success response is a bare confirmation
   * string — Canny's own reference shows the literal example response body
   * `success` for these (`posts/delete`, `votes/delete`, ...), un-enveloped in
   * an object. Whether that arrives already JSON-quoted (`"success"`) or as
   * raw unquoted text depends on the endpoint, so this tries a JSON parse
   * first and falls back to the trimmed raw text — never throwing over a
   * formatting difference that isn't an error.
   */
  async postMessage(path: string, params: Record<string, unknown> = {}): Promise<string> {
    const url = `${API_BASE}/${this.version}${path}`;
    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(compact(params)),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatCannyError(res.status, path, text));
    }
    const trimmed = text.trim();
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === "string" ? parsed : trimmed;
    } catch {
      return trimmed.replace(/^"|"$/g, "");
    }
  }
}

/** A v2 client is identical except for the path prefix it targets. */
export function v2(ctx: HookContext): CannyClient {
  return new CannyClient(ctx, "v2");
}
