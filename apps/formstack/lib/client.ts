import type { HookContext } from "@w6w/types";

/**
 * Formstack **V2025** API client.
 *
 * Every path and parameter here was verified on 2026-08-11 against Formstack's
 * own documentation — `developers.formstack.com/llms.txt` and the per-endpoint
 * `.md` pages it indexes, each of which embeds the OpenAPI fragment for that
 * endpoint — plus live probes against `www.formstack.com`.
 *
 * ## V2025, not the older v2
 *
 * Formstack runs two generations side by side and they are not the same API:
 *
 *   | Generation | Base                                    | Auth                    |
 *   | ---------- | --------------------------------------- | ----------------------- |
 *   | v2 (older) | `https://www.formstack.com/api/v2`      | OAuth2 / app tokens     |
 *   | **V2025**  | `https://www.formstack.com/api/v2025`   | **Personal Access Token** |
 *
 * This app targets V2025 — the current one, whose documentation the vendor
 * maintains and whose endpoints this file mirrors. The older `/api/v2` surface
 * is still live (it answers `401` rather than `404`), so a credential minted for
 * it will not work here and vice versa; `auth/access-token.ts` says so.
 *
 * ## Pagination parameter names are NOT consistent between endpoints
 *
 * This is the thing most likely to waste an afternoon. Verified from the
 * vendor's own OpenAPI fragments:
 *
 *   | Endpoint                        | Page parameter | Size parameter |
 *   | ------------------------------- | -------------- | -------------- |
 *   | `GET /forms`                    | `pageNumber`   | `pageSize`     |
 *   | `GET /forms/{id}/submissions`   | `pageNumber`   | `pageSize`     |
 *   | `GET /folders`                  | **`page`**     | **`perPage`**  |
 *
 * Sending `page` to `/forms` is not an error — it is ignored, and you silently
 * get page one forever. Each action therefore spells its own names rather than
 * sharing a helper that would hide the difference.
 *
 * ## Two request encodings
 *
 * The vendor's words: "By default, we expect HTTP url encoded query parameters.
 * To use JSON, simply change the Content-Type header … and put the JSON in the
 * body." This client always sends JSON with an explicit `content-type`, because
 * a submission's field values are structured and url-encoding them is lossy.
 */

export const BASE_URL = "https://www.formstack.com/api/v2025";

/** The older generation's base, named so `auth` can talk about it precisely. */
export const LEGACY_BASE_URL = "https://www.formstack.com/api/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface FormstackErrorBody {
  status?: string;
  error?: string;
  message?: string;
  errors?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same as {@link asJson}, but an absent value is simply absent rather than an error. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asJson<T>(value, label);
}

/**
 * Formstack's boolean query flags are string flags, not JSON booleans — the
 * OpenAPI fragments type them as `true`/`false` strings.
 */
export function flag(on: boolean | undefined): string | undefined {
  if (on === undefined) return undefined;
  return on ? "true" : "false";
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render a Formstack failure as one actionable line.
 *
 * The wire shape is `{"status":"error","error":"Unauthorized"}` — verified live
 * against both generations. `error` is the useful half; `message` and `errors`
 * appear on validation failures.
 *
 * A `429` gets its own sentence because Formstack's limit is a **daily** quota
 * per token that varies by plan, so "try again in a moment" would be wrong
 * advice — the window is a day, not a minute.
 */
export function formatFormstackError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: FormstackErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as FormstackErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const detail = parsed?.error ?? parsed?.message ??
    (parsed?.errors ? JSON.stringify(parsed.errors) : "");

  if (status === 429) {
    return truncate(
      `Formstack 429 for ${method} ${path}: daily API quota exhausted for this token` +
        `${detail ? ` (${detail})` : ""}. The window is a day and varies by plan — retrying ` +
        "shortly will not help.",
      1000,
    );
  }
  if (!detail) return `Formstack ${status} for ${method} ${path}: ${truncate(raw)}`;
  return truncate(`Formstack ${status} for ${method} ${path}: ${detail}`, 1000);
}

export class FormstackClient {
  constructor(private ctx: HookContext) {}

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      // Formstack defaults to url-encoded input; JSON has to be asked for by
      // name. Submission field values are structured, so this app always does.
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatFormstackError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
