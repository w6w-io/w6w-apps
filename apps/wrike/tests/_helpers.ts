/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "1" }]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://www.wrike.com/api/v4/tasks");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://www.wrike.com/api/v4";

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

/**
 * Wrike's client resolves the account host from the Connection, so an action
 * test needs a ctx carrying one. This wraps `mockCtx` with a redacted
 * connection whose `display` holds the host — exactly what `afterConnect`
 * records in production.
 */
export function mockWrikeCtx(responses: MockResponse[] = [], host = "www.wrike.com"): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.wrike",
    auth: "permanent-token",
    status: "live",
    display: { host },
  };
  return mock;
}

/** A ctx that also carries invocation metadata, for actions that read it. */
export function mockWrikeCtxWithInvocation(
  responses: MockResponse[] = [],
  invocationId = "inv-0123456789abcdef",
  host = "www.wrike.com",
): MockCtx {
  const mock = mockWrikeCtx(responses, host);
  (mock.ctx as { invocation?: unknown }).invocation = { invocationId, trigger: "run" };
  return mock;
}

/** Wrike's success envelope: `{"kind": "...", "data": [...]}`. */
export function envelope<T>(data: T[], kind = "data"): Record<string, unknown> {
  return { kind, data };
}

/** Wrike's error envelope, in the exact shape observed on the wire. */
export function errorBody(error: string, errorDescription: string): Record<string, unknown> {
  return { error, errorDescription };
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
