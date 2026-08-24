/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: 1 }) }]);
 *   await action.execute({ id: 1 }, ctx);
 *   assertEquals(calls[0].url, "https://app.clio.com/api/v4/matters/1.json");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export const API_ROOT = "https://app.clio.com/api/v4";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 204/303). String -> verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  redirect: string;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export function mockCtx(responses: MockResponse[] = [], connection?: RedactedConnection): MockCtx {
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

    calls.push({
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers,
      body,
      redirect: init?.redirect ?? "follow",
    });

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
    connection,
  };

  return { ctx, calls, logs };
}

/** A ctx whose Connection carries a region, for exercising `apiBase`. */
export function mockCtxWithRegion(responses: MockResponse[], region: string): MockCtx {
  return mockCtx(responses, { display: { region } } as unknown as RedactedConnection);
}

/** Clio's success envelope: `{"data": …}`. */
export function envelope<T>(data: T): Record<string, unknown> {
  return { data };
}

/** Clio's list envelope, with an optional `meta.paging` block. */
export function listEnvelope<T>(items: T[], paging?: { next?: string; previous?: string }) {
  return { data: items, ...(paging ? { meta: { paging } } : {}) };
}

/** The documented `{"error": {"type", "message"}}` shape. */
export function errorBody(type: string, message: string): Record<string, unknown> {
  return { error: { type, message } };
}

/** The RFC 6750 bearer-challenge shape, whose `error` is a bare string. */
export function bearerErrorBody(message: string): Record<string, unknown> {
  return { error: "invalid_token", error_description: message };
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
