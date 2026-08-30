/**
 * Test helper: build a mock `HookContext` for unit-testing actions.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { Id: "1" } }]);
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(new URL(calls[0].url).pathname, "/api/forms");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next response; if the queue is
 * empty the test fails loudly (so a test that makes an unexpected extra request surfaces the bug
 * rather than hanging).
 */
import type { HookContext } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object → JSON-encoded body. Undefined → no body. String → verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** Request body decoded as text (parsing left to the assertion); `null` for a `FormData` body. */
  body: string | null;
  /** The raw `RequestInit.body`, for assertions that need to inspect a `FormData` payload. */
  rawBody: BodyInit | null | undefined;
}

export interface MockCtx {
  ctx: HookContext;
  calls: CallRecord[];
  /** Any log lines emitted by the action, in order. */
  logs: Array<{ level: string; message: string; data?: unknown }>;
}

/** A Cognito Forms error body, per `lib/client.ts`'s `CognitoFormsErrorBody`. */
export function cfError(
  type: string,
  message: string,
  data: unknown = null,
  supportCode: string | null = "ABC-123-DEF",
) {
  return { Type: type, Message: message, SupportCode: supportCode, Data: data };
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
      : init.body instanceof FormData
      ? null
      : String(init.body);

    calls.push({ url, method, headers, body, rawBody: init?.body });

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

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}
