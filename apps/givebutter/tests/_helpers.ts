/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.givebutter.com/v1/campaigns/1");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.givebutter.com/v1";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 204). String -> verbatim. */
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

/** Givebutter's success envelope: `{"data": ...}`. */
export function envelope<T>(data: T): Record<string, unknown> {
  return { data };
}

/** Givebutter's `links`/`meta` page-number pagination envelope. */
export function pageEnvelope<T>(
  items: T[],
  extra: Partial<{ current_page: number; last_page: number; per_page: number; total: number }> = {},
): Record<string, unknown> {
  const per_page = extra.per_page ?? 20;
  return {
    data: items,
    links: { first: "…?page=1", last: "…?page=1", prev: null, next: null },
    meta: {
      current_page: extra.current_page ?? 1,
      from: items.length ? 1 : null,
      last_page: extra.last_page ?? 1,
      path: "https://api.givebutter.com/v1/campaigns",
      per_page,
      to: items.length || null,
      total: extra.total ?? items.length,
    },
  };
}

/** Givebutter's error envelope, in the shape actually observed on the wire. */
export function errorBody(message: string): Record<string, unknown> {
  return { error: { message } };
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}
