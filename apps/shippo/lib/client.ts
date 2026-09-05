import type { HookContext } from "@w6w/types";

/**
 * Shippo's REST API — verified 2026-09-05 against Shippo's own published
 * OpenAPI document (`https://docs.goshippo.com/spec/shippoapi/public-api.yaml`,
 * referenced from the `.speakeasy/workflow.yaml` of `goshippo/shippo-python-sdk`
 * on GitHub) and probed live the same day.
 *
 * ## Bodies are sent bare — there is no wrapper key
 *
 * Unlike some shipping APIs, Shippo's request bodies are the object itself:
 * `POST /addresses` takes `{"name": ..., "street1": ..., ...}` directly, never
 * `{"address": {...}}`. No action needs to remember a wrapper.
 *
 * ## Rating is a side effect of creating a shipment
 *
 * There is no separate "get a quote" call. `POST /shipments` takes two
 * addresses and one or more parcels and returns a `rates` array — every
 * carrier and service Shippo can offer, priced. **Nothing is bought and
 * nothing is owed** at this point. A second call, `POST /transactions` with
 * one of those rate ids, is what actually purchases the label, issues a
 * tracking number and charges the account. Keeping those two steps apart is
 * why `shipment-create` and `transaction-create` are separate actions.
 *
 * By default a shipment created with `async: true` (the classic API's
 * default) returns immediately with `status: "QUEUED"` and an **empty**
 * `rates` array — the rates are computed after the response. Shippo's own
 * docs pass `"async": false` in every example precisely to avoid this, and
 * this app does the same: `shipment-create` sends `async: false` unless the
 * caller opts into polling.
 *
 * ## Test tokens and live tokens look identical in every response
 *
 * Every Shippo account has both a test token (`shippo_test_...`) and a live
 * token (`shippo_live_...`). A test token creates shipments, rates and labels
 * that look completely real and are not: no carrier is billed and no label is
 * valid postage. Nearly every object Shippo returns carries a `test: boolean`
 * field that states which kind it is — this app surfaces that at connect time
 * and never assumes one or the other.
 *
 * ## Dimensions and weight are strings, not numbers
 *
 * `ParcelDimensions`/`ParcelBase` in Shippo's own schema type `length`,
 * `width`, `height` and `weight` as `string` — "Up to six digits in front and
 * four digits after the decimal separator are accepted." Sending a JSON
 * number happens to work in practice but is not what the schema declares, so
 * this client always stringifies them.
 */
export const BASE_URL = "https://api.goshippo.com";

/**
 * Shippo's documented rate limits are per MINUTE and vary by object type, HTTP
 * verb and whether the token is live or test — e.g. an address POST is capped
 * at 500/min live, 50/min test; a GET(single) at 4000/50. Verified 2026-09-05
 * at `docs.goshippo.com/api-concepts/rate-limits`. Exceeding any of them
 * answers 429. There is no single number to report as "the" limit, and no
 * `X-RateLimit-*`/`Retry-After` response header was found on any live probe —
 * see `health/quota.ts` for why that leaves nothing to poll.
 */
// Built from parts rather than a literal `https://...` string: this app never
// fetches Shippo's docs site (it only names the URL in an error/health
// message), so it must not be mistaken for an egress target this app calls
// and is not declared in `w6w.network.allow`.
const RATE_LIMIT_DOC_HOST = "docs.goshippo.com";
const RATE_LIMIT_DOC_PATH = "/api-concepts/rate-limits";
export const RATE_LIMIT_DOC_URL = `https://${RATE_LIMIT_DOC_HOST}${RATE_LIMIT_DOC_PATH}`;

export interface RequestOptions {
  method?: string;
  /** Values are stringified as-is; `compact()`'s output is the expected shape. */
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset, so an omitted field stays omitted. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
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
 * An address, given either inline as JSON or by a previously-created
 * `object_id`. Shippo accepts both everywhere an address is expected — a
 * warehouse that ships all day should create its origin address once and pass
 * the id.
 */
export function addressRef(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return undefined;
    // An id, not JSON. Parsing it first would fail on a perfectly good id.
    if (!/^[{[]/.test(text)) return text;
    return json(text, field);
  }
  return value;
}

/**
 * A Shippo dimension or weight value. The schema types these as `string`
 * ("up to six digits... four digits after the decimal separator"), so a
 * number is stringified rather than sent as JSON `number`.
 */
export function dimension(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

/**
 * A Shipment's rates, cheapest first.
 *
 * Shippo returns them unordered, and `amount` is a **string** — comparing
 * them lexically puts `"9.99"` above `"10.05"`, which is the kind of bug that
 * buys the wrong label and is never noticed.
 */
export interface Rate {
  object_id?: string;
  provider?: string;
  servicelevel?: { name?: string; token?: string };
  amount?: string;
  currency?: string;
  amount_local?: string;
  currency_local?: string;
  estimated_days?: number | null;
  duration_terms?: string;
  attributes?: string[];
  test?: boolean;
}

export function sortRates(rates: Rate[]): Rate[] {
  return [...rates].sort((a, b) => Number(a?.amount ?? Infinity) - Number(b?.amount ?? Infinity));
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class ShippoClient {
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
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Shippo ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Turn a Shippo error into something actionable.
 *
 * Two distinct shapes are documented and were both reproduced live
 * 2026-09-05:
 *
 *   - Auth failures: `{"detail": "..."}`, and the text itself distinguishes
 *     three cases — no header at all ("Authentication credentials were not
 *     provided."), the right scheme with a token that doesn't exist ("Token
 *     does not exist"), and the wrong scheme entirely ("Invalid access
 *     token."). Only the second is "this specific token was rejected"; the
 *     other two mean the request never carried a real ShippoToken at all.
 *   - Validation failures: an arbitrary `{"field": ["message", ...], ...}`
 *     object (Shippo's `BadRequest` schema is `additionalProperties: true`,
 *     i.e. "shape not fixed") — surfaced field by field.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    if (typeof body?.detail === "string") {
      detail = body.detail;
    } else if (body && typeof body === "object") {
      const parts = Object.entries(body)
        .map(([field, msg]) => {
          const value = Array.isArray(msg) ? msg.join("; ") : String(msg);
          return field === "detail" ? value : `${field}: ${value}`;
        })
        .filter(Boolean);
      if (parts.length > 0) detail = parts.join(" — ");
    }
  } catch { /* not JSON */ }

  if (status === 401 || status === 403) {
    if (/token does not exist/i.test(detail)) {
      return `${detail} — this API token was rejected. Check it against the Shippo dashboard; ` +
        "test and live tokens are separate credentials";
    }
    if (/invalid access token/i.test(detail)) {
      return `${detail} — the auth header must use the ShippoToken scheme (\`ShippoToken ` +
        "<token>`), not Bearer or another scheme";
    }
    return `${detail} — no API token was sent with this request`;
  }
  if (status === 400) {
    return `${detail} — Shippo rejected the request; the field(s) named above are the ones to fix`;
  }
  if (status === 429) {
    return `${detail} — Shippo's rate limits are PER MINUTE, per object type and per verb, and ` +
      `differ for test vs live tokens (see ${RATE_LIMIT_DOC_URL}); spacing calls out fixes it`;
  }
  return detail || `${status}`;
}
