/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), `${API_PATH}/clients.json`);
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of quietly passing.
 */
import type { HookContext } from "@w6w/types";

/** The v3.3 path prefix, as it appears in a request URL's pathname. */
export const API_PATH = "/api/v3.3";
export const API_ROOT = `https://api.createsend.com${API_PATH}`;

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body. String -> verbatim. */
  body?: unknown;
  /** Set to make `ctx.fetch` reject, standing in for a transport failure. */
  throws?: string;
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
    if (next.throws) return Promise.reject(new Error(next.throws));
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status: next.status ?? 200,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "application/json; charset=utf-8" },
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
 * Campaign Monitor's error envelope, in the exact shape observed on the wire on
 * 2026-08-11 (`{"Code":100,"Message":"Invalid API Key"}`, 40 bytes).
 */
export function errorBody(code: number, message: string): Record<string, unknown> {
  return { Code: code, Message: message };
}

/** The paged envelope every paged endpoint returns. */
export function pagedBody<T>(
  results: T[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    Results: results,
    ResultsOrderedBy: "date",
    OrderDirection: "asc",
    PageNumber: 1,
    PageSize: 1000,
    RecordsOnThisPage: results.length,
    TotalNumberOfRecords: results.length,
    NumberOfPages: 1,
    ...extra,
  };
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** The JSON body of a recorded call. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  if (!call.body) throw new Error("call had no body");
  return JSON.parse(call.body) as Record<string, unknown>;
}
