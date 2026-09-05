import type { HookContext } from "@w6w/types";

/**
 * Knack object-based REST API v1 client (`api.knack.com/v1`).
 *
 * Verified on 2026-09-05 against Knack's own reference docs at
 * `docs.knack.com/reference` (ReadMe-hosted; the catalog's older
 * `www.knack.com/developer-documentation/` link is dead — 301s to a marketing
 * redirect page) plus live probes against `api.knack.com`. Nothing here came
 * from a third-party integration directory.
 *
 * ## There is no schema-discovery endpoint
 *
 * Every documented route — `retrieving-records`, `retrieving-one-record`,
 * `creating-records`, `updating-records`, `deleting-records` — is scoped to
 * `/objects/{object_key}/records[...]` or a view's `/pages/{scene}/views/{view}/records`.
 * There is no `GET /v1/objects` to list an app's tables and no whoami/ping route
 * of any kind: reachability of ANYTHING requires already knowing an Object key.
 * That single fact shapes this app's whole design —
 *
 *  - every Action below takes an `objectKey` param, because one Connection's
 *    credential can reach every table in the Knack app, not just one;
 *  - `auth/application-key.ts`'s `test` hook cannot verify a credential without
 *    also being given one real Object key, so the Auth method collects a
 *    dedicated `testObject` field for that purpose alone;
 *  - finding an Object or Field key is a Builder task (System Fields on a
 *    table, or the object's settings), never an API call.
 *
 * ## Only ONE host — but it is per-application data behind it
 *
 * `api.knack.com` is fixed for every Knack customer; what varies is the
 * Application ID header, not the host. That is what lets this app declare a
 * plain `network.allow: ["api.knack.com"]` rather than a wildcard host pattern.
 *
 * ## Error bodies are PLAIN TEXT, not JSON — even though success bodies are JSON
 *
 * Measured live: an unauthenticated `GET /v1/objects/object_1/records` answers
 * `401` with the body `Invalid API Request` and `content-type: text/html`; a
 * malformed Application ID answers `400` with `Malformed App ID.` — no
 * envelope, no `{"error": …}`. Knack's own response-format reference names four
 * exact strings this way: `Malformed App ID` (400), `Invalid API key` (401),
 * `Invalid API request` (401, no Application ID header at all), and
 * `Invalid or Expired Token` (403, view-based only). A client that tries to
 * `JSON.parse` an error body will throw on every single one of them.
 *
 * ## Rate limits: two headers, and the docs don't say whether they ride every response
 *
 * `api-limits` documents `X-PlanLimit-Limit/Remaining/Reset` (the plan's daily
 * cap) and `X-RateLimit-Limit/Remaining/Reset` (10 requests/second on every
 * plan) side by side with a 429 example, but a separate "Checking the Remaining
 * API Request Limit" section frames `X-PlanLimit-Remaining` as something you can
 * read at any time to monitor usage proactively — not only after being
 * throttled. Without live credentials this could not be confirmed either way,
 * so `health/quota.ts` reads the headers if present and reports `unknown`
 * (never a guessed number) when they are absent.
 */

/** The one and only API origin — fixed regardless of which Knack app is being reached. */
export const API_BASE = "https://api.knack.com";
export const API_PREFIX = "/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** A Knack record: always an `id`, plus `field_N` / `field_N_raw` pairs the app's schema defines. */
export type KnackRecord = { id: string } & Record<string, unknown>;

/** The envelope every "retrieve multiple records" route answers. */
export interface KnackRecordsPage {
  total_pages: number;
  current_page: number;
  total_records: number;
  records: KnackRecord[];
}

/** `DELETE /objects/{key}/records/{id}` answers this and nothing else. */
export interface KnackDeleteResult {
  delete: boolean;
}

/**
 * Path-escape a caller-supplied Object key or record ID.
 *
 * Both are plain path segments (`object_1`, a 24-char record id) with no
 * documented special characters, but a value copied from the wrong field could
 * contain `/` or `?` — `encodeURIComponent` keeps that from reshaping the URL.
 */
export function encodeKey(value: string): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/** Drop query keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(
  obj: Record<string, QueryValue>,
): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. Required. */
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

/** Same, but absence is simply absence. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asJson<T>(value, label);
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}… (${trimmed.length} bytes truncated)`;
}

/**
 * Render Knack's plain-text error body as one actionable line.
 *
 * There is no machine-readable code to key off — the vendor's own error
 * "shape" IS the exact English sentence — so the sentence itself is kept
 * verbatim rather than discarded in favour of a bare status code.
 */
export function formatKnackError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const text = truncate(raw, 1000);
  const parts = [
    `Knack ${status} for ${method} ${path}`,
    text || undefined,
    status === 429
      ? "Knack limits every plan to 10 requests/second plus a daily cap; retry with backoff"
      : undefined,
  ].filter(Boolean);
  return parts.join(": ");
}

export class KnackClient {
  constructor(private ctx: HookContext) {}

  records(objectKey: string, query: Record<string, QueryValue>): Promise<KnackRecordsPage> {
    return this.request<KnackRecordsPage>(`/objects/${encodeKey(objectKey)}/records`, {
      query: compact(query),
    });
  }

  record(objectKey: string, recordId: string): Promise<KnackRecord> {
    return this.request<KnackRecord>(
      `/objects/${encodeKey(objectKey)}/records/${encodeKey(recordId)}`,
    );
  }

  createRecord(objectKey: string, fields: Record<string, unknown>): Promise<KnackRecord> {
    return this.request<KnackRecord>(`/objects/${encodeKey(objectKey)}/records`, {
      method: "POST",
      body: fields,
    });
  }

  updateRecord(
    objectKey: string,
    recordId: string,
    fields: Record<string, unknown>,
  ): Promise<KnackRecord> {
    return this.request<KnackRecord>(
      `/objects/${encodeKey(objectKey)}/records/${encodeKey(recordId)}`,
      { method: "PUT", body: fields },
    );
  }

  deleteRecord(objectKey: string, recordId: string): Promise<KnackDeleteResult> {
    return this.request<KnackDeleteResult>(
      `/objects/${encodeKey(objectKey)}/records/${encodeKey(recordId)}`,
      { method: "DELETE" },
    );
  }

  /** JSON in, JSON out. Throws a formatted error on a non-2xx response. */
  private async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatKnackError(res.status, options.method ?? "GET", path, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
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

    // No auth headers here — the host's runtime routes this call through
    // auth/application-key.ts's `sign` hook before it leaves the sandbox.
    return await this.ctx.fetch(url.toString(), init);
  }
}
