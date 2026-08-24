/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "v1" }) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.heygen.com/v3/videos/v1");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test that makes an
 * unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.heygen.com";

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
  /** Set only when the request body was a `FormData` — its entry names, for multipart tests. */
  formKeys?: string[];
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

    let body: string | null = null;
    let formKeys: string[] | undefined;
    if (init?.body instanceof FormData) {
      formKeys = [...init.body.keys()];
    } else if (init?.body != null) {
      body = typeof init.body === "string" ? init.body : String(init.body);
    }

    calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers, body, formKeys });

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

/** HeyGen's success envelope for a single resource: `{"data": {...}}`. */
export function envelope<T>(data: T): Record<string, unknown> {
  return { data };
}

/** HeyGen's list envelope: `data` beside `has_more`/`next_token`, not inside it. */
export function listEnvelope<T>(
  items: T[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { data: items, has_more: false, next_token: null, ...extra };
}

/** HeyGen's error envelope, in the exact shape observed on the wire. */
export function errorBody(code: string, message: string, param: string | null = null) {
  return { error: { code, message, param, doc_url: null } };
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
