/**
 * Test helper: build a mock `HookContext` for unit-testing actions.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([
 *     { body: "true" },
 *   ], { display: { baseUrl: "https://example.com/sendy" } });
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://example.com/sendy/subscribe");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next
 * response; if the queue is empty the test fails loudly.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** String → verbatim plain-text body. Anything else → JSON-encoded. */
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

export interface MockCtxOptions {
  /** Public connection metadata visible to actions via `ctx.connection.display`. */
  display?: Record<string, unknown>;
}

export function mockCtx(responses: MockResponse[] = [], options: MockCtxOptions = {}): MockCtx {
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
    const rawHeaders = init?.headers;
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => (headers[k.toLowerCase()] = v));
    } else if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k.toLowerCase()] = String(v);
    } else if (rawHeaders && typeof rawHeaders === "object") {
      for (const [k, v] of Object.entries(rawHeaders)) headers[k.toLowerCase()] = String(v);
    }
    const body = init?.body == null
      ? null
      : typeof init.body === "string"
      ? init.body
      : String(init.body);

    calls.push({ url, method, headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const status = next.status ?? 200;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string"
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody, {
        status,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": "text/plain" },
      }),
    );
  };

  const connection: RedactedConnection | undefined = options.display
    ? {
      id: "conn-test",
      app: "io.w6w.sendy",
      auth: "api-key",
      owner: "user-test",
      state: "connected",
      display: options.display,
      createdAt: "2026-08-01T00:00:00Z",
    }
    : undefined;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection,
  };

  return { ctx, calls, logs };
}
