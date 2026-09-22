/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "SV_1" }]) }]);
 *   await action.execute({ surveyId: "SV_1" }, ctx);
 *   assertEquals(calls[0].url, "https://iad1.qualtrics.com/API/v3/surveys");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 *
 * The connection carries the datacenter id on its REDACTED `display`, exactly as
 * `afterConnect` records it in production — the client builds every URL from
 * there and must never see a credential.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/** The datacenter the mock connection is pinned to. */
export const DATACENTER = "iad1";

/** The origin every request in these tests is expected to reach. */
export const API_ROOT = `https://${DATACENTER}.qualtrics.com/API/v3`;

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

export function connectionFor(
  datacenterId = DATACENTER,
  display: Record<string, unknown> = {},
): RedactedConnection {
  return {
    id: "conn-1",
    app: "io.w6w.qualtrics",
    auth: "api-token",
    owner: "owner-1",
    state: "connected",
    createdAt: "2026-09-22T00:00:00.000Z",
    display: { datacenterId, ...display },
  } as RedactedConnection;
}

export function mockCtx(
  responses: MockResponse[] = [],
  connection: RedactedConnection | undefined = connectionFor(),
): MockCtx {
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
    connection,
  };

  return { ctx, calls, logs };
}

/** Qualtrics' success envelope: `{"meta": {…}, "result": …}`. */
export function envelope<T>(
  result: T,
  meta: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    meta: { httpStatus: "200 - OK", requestId: "req-1", ...meta },
    result,
  };
}

/**
 * A `result.elements` page, with an optional `nextPage` URL.
 *
 * `nextPage` is a full URL, exactly as the vendor serves it — the client follows
 * it verbatim, so the tests assert against the same absolute form.
 */
export function listEnvelope<T>(
  elements: T[],
  nextPage?: string,
): Record<string, unknown> {
  return envelope({ elements, ...(nextPage ? { nextPage } : {}) });
}

/** Qualtrics' error envelope, in the exact shape observed on the wire. */
export function errorBody(
  errorCode: string,
  errorMessage: string,
  httpStatus = "401 - Unauthorized",
): Record<string, unknown> {
  return {
    meta: { httpStatus, error: { errorCode, errorMessage }, requestId: "req-1" },
  };
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
