import type { HookContext } from "@w6w/types";

/**
 * Crunchbase's v4 data API — verified against the OpenAPI document embedded
 * in `document.api.schema` at https://data.crunchbase.com/reference (a
 * ReadMe-hosted page whose own SSR payload carries Crunchbase's real,
 * versioned OAS files — `advanced-financials.yaml` v1.1.0, fetched
 * 2026-09-05), plus Crunchbase's own prose guides under
 * https://data.crunchbase.com/docs.
 *
 * A single fixed host, unlike a per-tenant API: `servers` is just
 * `https://api.crunchbase.com/v4`.
 */
export const BASE_URL = "https://api.crunchbase.com/v4/data";

/**
 * Crunchbase's REST API is entirely **read-only** — there is no write
 * endpoint anywhere in the OpenAPI document. Every action in this app is
 * therefore a `read`, `search` or `autocomplete` (itself a `read`); nothing
 * here needs `idempotent`.
 */

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Crunchbase answers both success and error bodies as JSON, but its error
 * responses are served with `content-type: text/plain` (verified live
 * 2026-09-05: `GET /data/entities/organizations/crunchbase` with a bad key
 * returns `401` with `Content-Type: text/plain` and body
 * `[{"status":401,"code":"LA401","message":"Unauthorized user_key"}]`). So
 * this reads the body as text first and parses it defensively rather than
 * trusting the header.
 */
export async function parseErrorBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return res.statusText || String(res.status);
  try {
    const parsed = JSON.parse(text);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    if (first && typeof first === "object" && "message" in first) {
      const code = "code" in first ? ` ${(first as { code: unknown }).code}` : "";
      return `${(first as { message: unknown }).message}${code}`;
    }
  } catch {
    // fall through to the raw text
  }
  return text;
}

/** Drop keys the caller left unset so a partial request doesn't send blanks. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field (`field_ids`, `card_ids`) into a list. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Parse a JSON param that must be an array — the shape `query` and `order`
 * both take.
 */
export function jsonArray(value: unknown, field: string): unknown[] | undefined {
  const parsed = json(value, field);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed)) throw new Error(`\`${field}\` must be a JSON array`);
  return parsed;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the credential header — the
 * runtime routes every request through the auth `sign` hook, which stamps
 * `X-cb-user-key`.
 */
export class CrunchbaseClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
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
      const detail = await parseErrorBody(res);
      throw new Error(`Crunchbase ${res.status} for ${init.method} /data${path}: ${detail}`);
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
