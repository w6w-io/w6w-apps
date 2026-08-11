/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { contacts: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.infusionsoft.com/crm";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 202/204). String -> verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export function mockCtx(responses: MockResponse[] = []): MockCtx {
  const queue = [...responses];
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];

  const fetchImpl = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    else if (Array.isArray(raw)) { for (const [k, v] of raw) headers[k.toLowerCase()] = String(v); }
    else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null
      ? null
      : typeof init.body === "string"
      ? init.body
      : String(init.body);

    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${
          calls[calls.length - 1].method
        } ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status: next.status ?? 200,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/**
 * Apigee's gateway fault body, in the exact shape observed on the wire on
 * 2026-08-11. This is NOT the shape either OpenAPI document declares — that one
 * is {@link apiErrorBody} — and every auth and throttle failure arrives in this
 * one instead.
 */
export function faultBody(errorcode: string, faultstring: string): Record<string, unknown> {
  return { fault: { faultstring, detail: { errorcode } } };
}

/** The `Error` schema both OpenAPI documents declare for every non-2xx response. */
export function apiErrorBody(
  code: number,
  message: string,
  status = "INVALID_ARGUMENT",
  details: Array<{ message: string }> = [],
): Record<string, unknown> {
  return { code, message, status, details };
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The query string of a recorded call, as a plain object (last value wins). */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** Every value of one repeated query key, in order. */
export function queryAll(url: string, key: string): string[] {
  return new URL(url).searchParams.getAll(key);
}

/** The raw query string of a recorded call, so percent-encoding can be asserted. */
export function rawQuery(url: string): string {
  const i = url.indexOf("?");
  return i === -1 ? "" : url.slice(i + 1);
}

/**
 * A populated `x-keap-*` header set, matching the families Keap documents.
 *
 * The tenant-throttle family is pipe-delimited on purpose: that is the form
 * measured on the wire (`time-unit: minute|day`, `interval: 1|1`), and the
 * whole point of `readQuotaHeaders` is that it survives it.
 */
export function quotaHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-keap-product-quota-limit": "150000",
    "x-keap-product-quota-time-unit": "day",
    "x-keap-product-quota-interval": "1",
    "x-keap-product-quota-available": "149999",
    "x-keap-product-quota-used": "1",
    "x-keap-product-throttle-limit": "1500",
    "x-keap-product-throttle-time-unit": "minute",
    "x-keap-product-throttle-interval": "1",
    "x-keap-product-throttle-available": "1499",
    "x-keap-product-throttle-used": "1",
    "x-keap-tenant-throttle-limit": "10000|250000",
    "x-keap-tenant-throttle-time-unit": "minute|day",
    "x-keap-tenant-throttle-interval": "1|1",
    "x-keap-tenant-throttle-available": "9999|249999",
    "x-keap-tenant-throttle-used": "1|1",
    ...overrides,
  };
}

/**
 * The header set an UNAUTHENTICATED response actually carries — every name
 * present, every numeric value blank. Measured 2026-08-11.
 */
export function emptyQuotaHeaders(): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-keap-product-spike-limit": "",
    "x-keap-product-throttle-limit": "",
    "x-keap-product-throttle-time-unit": "",
    "x-keap-product-throttle-interval": "",
    "x-keap-product-throttle-available": "",
    "x-keap-product-throttle-used": "",
    "x-keap-product-quota-limit": "",
    "x-keap-product-quota-time-unit": "",
    "x-keap-product-quota-interval": "",
    "x-keap-product-quota-available": "",
    "x-keap-product-quota-used": "",
    "x-keap-tenant-id": "",
    "x-keap-tenant-throttle-limit": "|",
    "x-keap-tenant-throttle-time-unit": "minute|day",
    "x-keap-tenant-throttle-interval": "1|1",
    "x-keap-tenant-throttle-available": "|",
    "x-keap-tenant-throttle-used": "|",
  };
}
