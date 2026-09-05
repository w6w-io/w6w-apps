/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { spaces: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://dust.tt/api/v1/w/ws_1/spaces");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export const DUST_WS = "ws_test123";
export const US_ROOT = `https://dust.tt/api/v1/w/${DUST_WS}`;

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

function buildFetch(responses: MockResponse[], calls: CallRecord[]) {
  const queue = [...responses];
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
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
}

/** A bare ctx with no Connection — for Auth hooks, which take the credential directly. */
export function mockCtx(responses: MockResponse[] = []): MockCtx {
  const calls: CallRecord[] = [];
  const logs: MockCtx["logs"] = [];
  const ctx: HookContext = {
    fetch: buildFetch(responses, calls) as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };
  return { ctx, calls, logs };
}

/** A ctx carrying a Connection whose `display` records workspace id + region — what every Action reads. */
export function mockCtxWithConnection(
  responses: MockResponse[] = [],
  display: Record<string, unknown> = { workspaceId: DUST_WS, region: "us" },
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: RedactedConnection }).connection = {
    id: "conn_test",
    auth: "api-key",
    display,
  } as unknown as RedactedConnection;
  return mock;
}

/** Dust's error envelope, in the exact shape observed on the wire. */
export function errorBody(type: string, message: string): Record<string, unknown> {
  return { error: { type, message } };
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
