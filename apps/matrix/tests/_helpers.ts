/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Usage:
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { room_id: "!x:example.org" } }], {
 *     homeserverUrl: "https://matrix.example.org",
 *   });
 *   const result = await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://matrix.example.org/_matrix/client/v3/createRoom");
 *
 * The mock queues responses one-per-fetch. Each fetch pops the next response;
 * an unqueued fetch throws loudly, so a test making an unexpected extra
 * request fails instead of hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body (e.g. 200 {}). String -> verbatim. */
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
  invocationId?: string;
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

    calls.push({ url, method, headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${method} ${url} — no queued response`,
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

  const connection: RedactedConnection | undefined = options.display
    ? {
      id: "conn-test",
      app: "io.w6w.matrix",
      auth: "access-token",
      owner: "user-test",
      state: "connected",
      display: options.display,
      createdAt: "2026-09-06T00:00:00Z",
    }
    : undefined;

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
    connection,
    invocation: options.invocationId
      ? { invocationId: options.invocationId, runId: "run-test", stepId: "step-test" }
      : undefined,
  };

  return { ctx, calls, logs };
}

export const HOMESERVER = "https://matrix.example.org";

/** A ctx wired to a Connection whose display already carries a homeserver + user id. */
export function mockMatrixCtx(
  responses: MockResponse[] = [],
  display: Record<string, unknown> = { homeserverUrl: HOMESERVER, userId: "@alice:example.org" },
): MockCtx {
  return mockCtx(responses, { display });
}

/** Matrix's standard error envelope, in the exact shape the spec documents. */
export function matrixError(errcode: string, error: string): Record<string, unknown> {
  return { errcode, error };
}

export const ACCESS_TOKEN = "syt_YWxpY2U_abcdefghijklmnop_1a2b3c";
