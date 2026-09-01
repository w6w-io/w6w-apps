import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Pendo — verified against Pendo's own Postman collection (fetched live
 * 2026-09-01 from `https://engageapi.pendo.io/api/collections/16265887/Tzm6jvKG`,
 * the machine-readable source `engageapi.pendo.io`'s Postman-generated docs
 * page names as "the source of truth for this documentation"), and against
 * `https://status.pendo.io/api/v2/summary.json` for the status feed.
 *
 * ## Two credentials, five regions, two host families
 *
 * Almost every endpoint in `/api/v1/*` takes one **Integration Key** as the
 * `x-pendo-integration-key` header. The exception is the Track Event endpoint
 * (`POST /data/track`), which takes the SAME header name but a DIFFERENT
 * secret — the **Track Event Shared Secret**, found on a different settings
 * page (Subscription Settings → the app → "Track Event Shared Secret", not
 * Settings → Integrations). Pendo's own docs call this out explicitly: "Your
 * Pendo_trackEventSecret_Key is different from your x-pendo-integration-key".
 * Using the integration key there does not obviously fail — see `describeError`.
 *
 * A subscription lives in one of five regions, each with its own pair of hosts:
 *
 * | Region | API host (`/api/v1/*`) | Data host (`/data/*`) |
 * | --- | --- | --- |
 * | US  | `app.pendo.io`     | `data.pendo.io` |
 * | EU  | `app.eu.pendo.io`  | `data.eu.pendo.io` |
 * | US1 | `us1.app.pendo.io` | `us1.data.pendo.io` |
 * | JPN | `app.jpn.pendo.io` | `data.jpn.pendo.io` |
 * | AU  | `app.au.pendo.io`  | `data.au.pendo.io` |
 *
 * A key from one region's subscription is simply invalid against another
 * region's host — there is no cross-region routing.
 *
 * ## A bad key answers with an EMPTY body
 *
 * Verified live 2026-09-01 against `GET /api/v1/token/verify`: a missing or
 * wrong integration key gets `403` with **no response body at all** — not
 * even `{"valid":false}`. Only a genuinely valid key gets the documented
 * `{"valid":true,"writeAccess":true}` JSON. There is no error detail Pendo
 * publishes to distinguish "wrong key" from "revoked key" from "right key,
 * wrong region" — the auth `test` hook says so rather than guessing.
 *
 * ## Aggregation is a query language, not an export tool
 *
 * `POST /api/v1/aggregation` runs Pendo's own pipeline language — the same
 * one every built-in Pendo report is built from. Pendo's own docs warn it is
 * "NOT intended to be a bulk export feature" and cap a single call at a
 * 5-minute runtime or 4 GB of output.
 */

/** Region -> its API host (`/api/v1/*`) and data host (`/data/*`). */
export const REGIONS = {
  US: { api: "app.pendo.io", data: "data.pendo.io" },
  EU: { api: "app.eu.pendo.io", data: "data.eu.pendo.io" },
  US1: { api: "us1.app.pendo.io", data: "us1.data.pendo.io" },
  JPN: { api: "app.jpn.pendo.io", data: "data.jpn.pendo.io" },
  AU: { api: "app.au.pendo.io", data: "data.au.pendo.io" },
} as const;

export type Region = keyof typeof REGIONS;

/** Every `/data/*` host across all regions — these take the track secret, not the integration key. */
export const DATA_HOSTS = new Set<string>(Object.values(REGIONS).map((r) => r.data));

/** Public (redacted-safe) connection metadata. */
export interface PendoConnectionDisplay {
  region?: string;
}

/** Normalise a region field, defaulting to US. */
export function regionOf(value: unknown): Region {
  const v = String(value ?? "US").trim().toUpperCase();
  return (v in REGIONS ? v : "US") as Region;
}

/** Read the region off the redacted Connection. */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as PendoConnectionDisplay;
  return regionOf(display.region);
}

/** Drop keys the caller left unset, so a partial input never sends `null`/`""` fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated (or array) form field into a joined `id=a,b,c` value. */
export function csv(v: unknown): string | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items.join(",") : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean).join(",");
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

/** Turn a failure response into something actionable. Pendo publishes no error schema. */
export function describeError(status: number, text: string): string {
  let detail = text?.trim();
  if (detail) {
    try {
      const body = JSON.parse(detail) as { error?: string; message?: string };
      detail = body?.error ?? body?.message ?? detail;
    } catch {
      // Several endpoints answer with plain text, or nothing at all.
    }
  }
  if (!detail) {
    if (status === 403) {
      return "403 with an empty body — Pendo does not distinguish a missing key, a wrong key, " +
        "a revoked key, or a key from another region's subscription. Check the key in Settings " +
        "→ Integrations, and confirm the region matches the subscription it was created on";
    }
    if (status === 404) {
      return '404 — check the id in the path exists (Pendo returns 404 for both "not found" ' +
        'and "you don\'t have access to this")';
    }
    return `HTTP ${status}`;
  }
  return detail;
}

export interface ApiOptions {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets a credential — the runtime routes
 * every request through the auth `sign` hook, which knows which secret each
 * host needs.
 */
export class PendoClient {
  readonly region: Region;

  constructor(private ctx: HookContext) {
    this.region = regionFromConnection(ctx.connection);
  }

  get apiHost(): string {
    return `https://${REGIONS[this.region].api}`;
  }

  get dataHost(): string {
    return `https://${REGIONS[this.region].data}`;
  }

  /** `/api/v1/*` — the integration-key side. */
  async api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
    const url = new URL(`${this.apiHost}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Pendo ${res.status} for ${url.pathname}: ${describeError(res.status, text)}`,
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // A handful of endpoints answer with a bare (already-quoted) JSON scalar;
      // anything that still fails to parse is not something this client invented.
      throw new Error(`Pendo did not return JSON from ${url.pathname}: ${text.slice(0, 160)}`);
    }
  }

  /** `POST /data/track` — the track-secret side. Answers 200 with no body on success. */
  async track(body: Record<string, unknown>): Promise<void> {
    const res = await this.ctx.fetch(`${this.dataHost}/data/track`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Pendo track ${res.status}: ${describeError(res.status, text)}`);
    }
  }
}
