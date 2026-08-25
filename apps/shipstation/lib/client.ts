import type { HookContext } from "@w6w/types";

/**
 * ShipStation **V2** API — verified against `docs.shipstation.com` (2026-08-25), the
 * vendor's current documentation portal, and probed live the same day against
 * `https://api.shipstation.com`.
 *
 * ## There are two live APIs, and only one of them is this one
 *
 * `docs.shipstation.com` documents **both** a legacy `ShipStation V1 API` and the
 * current `ShipStation V2 API`. The vendor's own authentication page says it plainly:
 * "The V1 API is deprecated and will be removed in the future." V1 and V2 issue
 * **separate API keys** — a V1 key does not work against `/v2/*` and vice versa. This
 * app is built entirely against **V2**, sent as a plain `API-Key` header (see
 * `auth/api-key.ts`).
 *
 * A third surface, `docs.shipstation.com/apis/shipengine/*`, documents the sibling
 * **ShipEngine** product on host `api.shipengine.com` — a related but distinct product
 * from the same vendor (Auctane) sharing the same request/response shapes and the same
 * `error_source: "shipengine"` in every error body (ShipStation V2 is built on the
 * ShipEngine platform under the hood). This app calls `api.shipstation.com` only, the
 * host the task's own live probe confirmed reachable, and reads the ShipEngine-branded
 * pages purely as schema reference where the ShipStation-branded pages are thin.
 *
 * ## "Order" does not mean order, and "shipment" does not mean shipment
 *
 * This is the single most disorienting thing about this API, called out explicitly on
 * `docs.shipstation.com/orders/understanding-orders-shipments`:
 *
 * | ShipStation UI / V1 term | V2 API term | What it is |
 * |---|---|---|
 * | Order | **Shipment** | The intent to ship — addresses, packages, carrier/service |
 * | Shipment | **Label** | A purchased shipping label — tracking number, cost, files |
 *
 * So a workflow author who says "create an order" wants `shipment-create`, and one who
 * says "get the shipment info" (V1 sense) wants a `label-*` action. Every action and
 * param in this app uses the **V2** terms (`shipment`, `label`) with the V1 mapping
 * called out in each action's description, because building the other way — aliasing
 * actions to the pre-rename nouns — would silently break the moment ShipStation's own
 * docs (which a user will inevitably open) are read side by side with this app.
 *
 * There is a genuine, separate **Sales Order** concept (`/v-beta/sales_orders`,
 * import from connected marketplaces) but it is gated to the "Advanced plan or higher"
 * per `docs.shipstation.com/apis/shipengine/docs/sales-orders/get-started-with-orders`
 * and lives at a `v-beta` path the vendor has not promoted to `v2` — both are reasons
 * good enough to leave it out of a first-party app rather than build against a surface
 * most accounts cannot reach and the vendor has not committed to. It is not implemented
 * here; see the README.
 *
 * ## Label creation is three endpoints, not one
 *
 * `POST /v2/labels` (inline shipment details), `POST /v2/labels/rates/{rate_id}`
 * (from a previously quoted rate), and `POST /v2/labels/shipment/{shipment_id}` (from
 * an existing shipment) are three **different URLs**, not one endpoint accepting three
 * optional body shapes. `label-create` below picks the right one from which id the
 * caller supplied.
 *
 * ## `POST /v2/rates` is a "read" with a side effect
 *
 * Retrieving rates for inline shipment details is a `POST`, and per
 * `docs.shipstation.com/retrieve-rates` ShipStation *stores that shipment* server-side
 * and returns its `shipment_id` alongside the rates — a "just get me a quote" call
 * silently creates a persistent shipment record on every call. `rate-get` is therefore
 * `perform`/non-idempotent rather than `read`, and its output surfaces the created
 * `shipmentId` so a caller isn't surprised to find it later in `shipment-list`.
 */
export const BASE_URL = "https://api.shipstation.com";
export const API_PATH = "/v2";

/** Default page size on every list endpoint that documents one. */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Documented per-key rate limit — verified 2026-08-25 against
 * `docs.shipstation.com/rate-limits`: 200 requests/minute in production, 20/minute in
 * the Sandbox environment. `Retry-After` is documented on `429` responses only; a live
 * probe of a successful (401, in this case unauthenticated) response carried no
 * `X-RateLimit-*` header of any kind, so there is nothing to poll for headroom outside
 * of hitting the limit itself. See `health/quota.ts`.
 */
export const RATE_LIMIT_PER_MINUTE = 200;
export const SANDBOX_RATE_LIMIT_PER_MINUTE = 20;

export interface Money {
  currency: string;
  amount: number;
}

export interface Weight {
  value: number;
  unit: "pound" | "ounce" | "gram" | "kilogram";
}

export interface Dimensions {
  unit: "inch" | "centimeter";
  length: number;
  width: number;
  height: number;
}

/** `address_residential_indicator` — ShipStation defaults this to `"unknown"`. */
export type ResidentialIndicator = "unknown" | "yes" | "no";

export interface Address {
  name?: string;
  phone?: string;
  email?: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string;
  address_line3?: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator?: ResidentialIndicator;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset, so an omitted field stays omitted rather than null. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** `compact` for a query string. */
export function query(obj: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
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

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown> | unknown[];
}

/** One error object inside ShipStation's `errors` array. */
export interface ShipStationError {
  error_source?: string;
  error_type?: string;
  error_code?: string;
  message?: string;
  field_name?: string;
  field_value?: unknown;
}

export interface ShipStationErrorBody {
  request_id?: string;
  errors?: ShipStationError[];
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the `API-Key` header — the runtime
 * routes every request through the Auth `sign` hook.
 */
export class ShipStationClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(query(options.query ?? {}))) {
      url.searchParams.set(k, v);
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
        `ShipStation ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Turn a ShipStation error body into something actionable.
 *
 * Errors arrive as `{"request_id", "errors":[{"error_source","error_type",
 * "error_code","message","field_name"?,"field_value"?}]}` — `errors-codes.md`, verified
 * live 2026-08-25 (an unauthenticated `GET /v2/labels` answers exactly this shape).
 *
 * `error_source` says who to blame — `shipengine` (ShipStation itself), or a
 * third-party (`carrier`, `order_source`) — and is worth keeping in the message,
 * because a `carrier` source often means "call the carrier", not "fix the request".
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as ShipStationErrorBody;
    const errs = body.errors ?? [];
    if (errs.length > 0) {
      detail = errs
        .map((e) => {
          const parts = [e.message ?? e.error_code ?? "unspecified error"];
          if (e.error_source) parts.push(`(source: ${e.error_source})`);
          if (e.field_name) parts.push(`— field \`${e.field_name}\``);
          return parts.join(" ");
        })
        .join("; ");
      if (body.request_id) detail += ` [request_id: ${body.request_id}]`;
    }
  } catch { /* not JSON */ }

  if (status === 401 || status === 403) {
    // Measured 2026-08-25: a missing `API-Key` header and a syntactically valid but
    // wrong one both answer this exact body — `{"error_code":"unauthorized",
    // "error_type":"security","message":"Access denied.","error_source":"shipengine"}`
    // — so the status/body cannot tell "not sent" from "wrong" apart, only "not this
    // app's V2 key" from everything else.
    return `${detail} — check the API key. This must be a ShipStation V2 key (V1 legacy keys ` +
      "are separate and rejected here); ShipStation reports a missing and an invalid key " +
      "identically";
  }
  if (status === 429) {
    return `${detail} — ShipStation limits accounts to ${RATE_LIMIT_PER_MINUTE} requests/minute ` +
      `in production (${SANDBOX_RATE_LIMIT_PER_MINUTE}/minute in Sandbox). Check the ` +
      "Retry-After response header for how long to wait";
  }
  return detail || `${status}`;
}
