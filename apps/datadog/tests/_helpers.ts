/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { valid: true } }]);
 *   await validate.execute({}, ctx);
 *   assertEquals(calls[0].url, `${US1}/api/v1/validate`);
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 *
 * Every ctx carries a Connection whose `display.site` is set, because that is
 * how this app learns which of Datadog's nine hosts to address — a ctx without
 * one would silently exercise the US1 fallback and prove nothing about the rest.
 */
import type { HookContext } from "@w6w/types";

export const US1 = "https://api.datadoghq.com";
export const EU1 = "https://api.datadoghq.eu";

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

export function mockCtx(responses: MockResponse[] = [], site = "us1"): MockCtx {
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

  const ctx = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level: string, message: string, data?: unknown) => logs.push({ level, message, data }),
    connection: {
      id: "conn-1",
      app: "io.w6w.datadog",
      auth: "api-key",
      owner: "user-1",
      state: "connected",
      createdAt: "2026-08-11T00:00:00Z",
      display: { site, apiHost: `api.${site}` },
    },
  } as unknown as HookContext;

  return { ctx, calls, logs };
}

/** A ctx with no Connection at all, for the checks that must survive one. */
export function mockCtxWithoutConnection(responses: MockResponse[] = []): MockCtx {
  const mock = mockCtx(responses);
  delete (mock.ctx as { connection?: unknown }).connection;
  return mock;
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

/** The origin of a recorded call. */
export function originOf(url: string): string {
  return new URL(url).origin;
}

/** The JSON body of a recorded call. */
export function bodyOf(call: { body: string | null }): Record<string, unknown> {
  return JSON.parse(call.body ?? "{}") as Record<string, unknown>;
}
