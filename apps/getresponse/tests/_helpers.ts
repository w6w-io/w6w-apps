/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";
import type { GetResponsePlatform } from "../lib/client.ts";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
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

export const RETAIL_BASE = "https://api.getresponse.com/v3";
export const MAX_US_BASE = "https://api3.getresponse360.com/v3";

/**
 * A ctx carrying a live Connection whose `display` records the platform —
 * exactly what `afterConnect` writes. It holds no credential.
 */
export function mockGetResponseCtx(
  responses: MockResponse[] = [],
  platform: GetResponsePlatform = "retail",
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.getresponse",
    auth: "api-key",
    status: "live",
    display: {
      platform,
      account: { id: "acc1", email: "ada@example.com", company: "Example" },
    },
  };
  return mock;
}

/** GetResponse's error body, in the exact shape observed on the wire. */
export function errorBody(
  code: number,
  message: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    httpStatus: code === 1015 ? 429 : 401,
    code,
    codeDescription: code === 1014
      ? "Problem during authentication process, check headers!"
      : "Too many request to API, quota reached, please wait till next quota window",
    message,
    moreInfo: "https://apidocs.getresponse.com/v3/errors",
    ...extra,
  };
}

/** A syntactically plausible API key. GetResponse keys are 32 hex characters. */
export const API_KEY = "0123456789abcdef0123456789abcdef";
