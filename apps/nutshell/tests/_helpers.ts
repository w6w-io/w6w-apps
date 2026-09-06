/**
 * Test helpers: a mock `HookContext` for unit-testing Nutshell actions.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ result: { id: 1 } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(rpcBody(calls[0]).method, "getLead");
 */
import type { HookContext } from "@w6w/types";

export const TEST_EMAIL = "bot@acme.com";
export const TEST_API_KEY = "0123456789abcdef";

/**
 * A queued fake response.
 *
 * `result`/`error` build a JSON-RPC envelope, which is what Nutshell actually
 * returns; `body` is the escape hatch for malformed/non-JSON responses.
 */
export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
  /** Verbatim body — overrides `result`/`error`. */
  body?: string;
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
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    const raw = init?.headers;
    if (raw instanceof Headers) {
      raw.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(raw)) {
      for (const [k, v] of raw) headers[k.toLowerCase()] = String(v);
    } else if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null ? null : String(init.body);

    calls.push({ url, method, headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const text = next.body !== undefined ? next.body : JSON.stringify(
      next.error
        ? { jsonrpc: "2.0", id: "1", error: next.error }
        : { jsonrpc: "2.0", id: "1", result: next.result ?? null },
    );
    return Promise.resolve(
      new Response(text, {
        status: next.status ?? 200,
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const ctx = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level: string, message: string, data?: unknown) => logs.push({ level, message, data }),
  } as unknown as HookContext;

  return { ctx, calls, logs };
}

/** The parsed JSON-RPC request body of a recorded call. */
export function rpcBody(
  call: CallRecord,
): { jsonrpc: string; id: string; method: string; params: Record<string, unknown> } {
  if (!call.body) throw new Error("recorded call had no body");
  return JSON.parse(call.body);
}

/** A well-formed stored credential, for auth tests. */
export function credential(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { email: TEST_EMAIL, apiKey: TEST_API_KEY, ...overrides };
}
