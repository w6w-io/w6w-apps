/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { candidates: [] } }]);
 *   await candidateList.execute({}, ctx);
 *   assertEquals(calls[0].url, "https://api.recruitee.com/c/123/candidates");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export const COMPANY_ID = "123";
export const API_ROOT = `https://api.recruitee.com/c/${COMPANY_ID}`;

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

const CONNECTION: RedactedConnection = {
  id: "conn_1",
  app: "io.w6w.recruitee",
  auth: "api-token",
  owner: "user_1",
  state: "connected",
  display: { companyId: COMPANY_ID, email: "admin@example.com" },
  createdAt: new Date().toISOString(),
};

export function mockCtx(responses: MockResponse[] = [], companyId = COMPANY_ID): MockCtx {
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
    connection: companyId === COMPANY_ID ? CONNECTION : { ...CONNECTION, display: { companyId } },
  };

  return { ctx, calls, logs };
}

/** A ctx with no Connection at all — for auth hooks, which never receive one. */
export function mockCtxNoConnection(responses: MockResponse[] = []): MockCtx {
  const mock = mockCtx(responses);
  const ctx = { ...mock.ctx };
  delete (ctx as { connection?: unknown }).connection;
  return { ...mock, ctx };
}

/** Recruitee's error envelope, in the exact shapes observed on the wire and in the docs. */
export function errorBody(
  error: string | string[],
  errorCode?: string | null,
  errorFields?: Record<string, string[]>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { error };
  if (errorCode !== undefined) out.error_code = errorCode;
  if (errorFields) out.error_fields = errorFields;
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The query string of a recorded call, as a plain object. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}
