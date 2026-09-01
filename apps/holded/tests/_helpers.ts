/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.holded.com/api/crm/v1/funnels");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.holded.com/api/crm/v1";

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

/** Holded's write envelope: `{status, info, id?}`. */
export function writeResult(info: string, id?: string): Record<string, unknown> {
  return id !== undefined ? { status: 1, info, id } : { status: 1, info };
}

/** Holded's app-layer error body: `{status: 0, info}`. */
export function errorBody(info: string): Record<string, unknown> {
  return { status: 0, info };
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/**
 * `execute()`'s return type is `unknown` (see `ActionExecuteHook`'s `O`
 * default) unless an action spells out its own output generic, which this
 * app's actions deliberately don't for a plain passthrough result. Tests cast
 * through this helper at the call site rather than sprinkling `as` everywhere.
 */
export interface MutationResult {
  status: number;
  info?: string;
  id?: string;
}

export function asMutation(x: unknown): MutationResult {
  return x as MutationResult;
}
