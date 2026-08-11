/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: items([{ _id: 1 }]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/rest/v1/collections");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.raindrop.io/rest/v1";

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

/** Raindrop's single-item envelope. */
export function item<T>(value: T): Record<string, unknown> {
  return { result: true, item: value };
}

/** Raindrop's list envelope. */
export function items<T>(
  values: T[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { result: true, items: values, ...extra };
}

/** A bare `{result: true}` — what the mutating endpoints answer. */
export function okBody(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { result: true, ...extra };
}

/**
 * Raindrop's error envelope, in the exact shape observed on the wire.
 *
 * `status` is included because the vendor puts its own status in the body and it
 * does not always match the HTTP status — the whole reason `formatRaindropError`
 * reports both.
 */
export function errorBody(
  errorMessage: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { result: false, errorMessage, ...extra };
}

/** The exact 401 body Raindrop returns when no credential arrives (measured). */
export const UNAUTHORIZED_BODY = {
  result: false,
  status: 401,
  errorMessage: "Unauthorized",
  auth: false,
};

/** The exact 401 body Raindrop returns for a rejected token (measured). */
export const BAD_TOKEN_BODY = {
  result: false,
  status: 401,
  errorMessage: "Incorrect access_token",
  auth: false,
};

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

/** The JSON body of a recorded call. */
export function bodyOf(call: { body: string | null }): Record<string, unknown> {
  return call.body ? JSON.parse(call.body) as Record<string, unknown> : {};
}
