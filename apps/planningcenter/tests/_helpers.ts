/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: collection([]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/people/v2/people");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body. String -> verbatim. */
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

/** A JSON-API single-resource envelope, optionally with `included`. */
export function single<T>(
  type: string,
  id: string,
  attributes: T,
  options: { relationships?: Record<string, unknown>; included?: unknown[] } = {},
): Record<string, unknown> {
  return {
    data: { type, id, attributes, relationships: options.relationships },
    included: options.included,
  };
}

/** A JSON-API collection envelope, with the standard offset-pagination `meta`. */
export function collection<T>(
  type: string,
  items: Array<{ id: string; attributes: T; relationships?: Record<string, unknown> }>,
  meta: { total_count?: number; next?: { offset: number } } = {},
): Record<string, unknown> {
  return {
    data: items.map((i) => ({
      type,
      id: i.id,
      attributes: i.attributes,
      relationships: i.relationships,
    })),
    meta,
  };
}

/** The JSON-API error envelope used for 422/429 responses. */
export function errorBody(code: string, detail: string): Record<string, unknown> {
  return { errors: [{ code, detail }] };
}

/** The query string of a recorded call, as a plain object (last value wins). */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The parsed JSON body of a recorded call. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  return call.body ? JSON.parse(call.body) as Record<string, unknown> : {};
}
