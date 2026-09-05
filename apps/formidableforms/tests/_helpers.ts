/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }], { display });
 *   await action.execute!({ entryId: 1 }, ctx);
 *   assertEquals(new URL(calls[0].url).pathname, "/wp-json/frm/v3/entries/1");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next response;
 * if the queue is empty the test fails loudly, so a hook that makes an
 * unexpected extra request surfaces the bug rather than hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

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
  /** Request body decoded as text (JSON parsing left to the assertion). */
  body: string | null;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

export interface MockCtxOptions {
  /** Public connection metadata visible to hooks via `ctx.connection.display`. */
  display?: Record<string, unknown>;
}

/** The display payload a connected Formidable site publishes. */
export const DISPLAY = { siteUrl: "https://example.com" };

/** Base path every assertion in these tests expects for `DISPLAY`. */
export const BASE_PATH = "/wp-json/frm/v3";

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
        headers: next.headers ?? { "content-type": "application/json" },
      }),
    );
  };

  const connection: RedactedConnection | undefined = options.display
    ? {
      id: "conn-test",
      app: "io.w6w.formidableforms",
      auth: "basic",
      owner: "user-test",
      state: "connected",
      display: options.display,
      createdAt: "2026-09-05T00:00:00Z",
    }
    : undefined;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection,
  };

  return { ctx, calls, logs };
}

/** Query params of the nth recorded call. */
export function paramsOf(calls: CallRecord[], n = 0): URLSearchParams {
  return new URL(calls[n].url).searchParams;
}

/** JSON-decoded request body of the nth recorded call. */
export function bodyOf(calls: CallRecord[], n = 0): Record<string, unknown> {
  return JSON.parse(calls[n].body ?? "{}") as Record<string, unknown>;
}
