/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { voices: [] } }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/v2/voices");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.elevenlabs.io";

export interface MockResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Object -> JSON-encoded body. Undefined -> no body. String/bytes -> verbatim. */
  body?: unknown;
}

export interface CallRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  /** Set when the request body was a `FormData` — the multipart endpoints. */
  form?: Record<string, string>;
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
    let form: Record<string, string> | undefined;
    if (init?.body instanceof FormData) {
      form = {};
      for (const [k, v] of init.body.entries()) form[k] = String(v);
    } else if (init?.body != null) {
      body = typeof init.body === "string" ? init.body : String(init.body);
    }

    const record: CallRecord = {
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers,
      body,
    };
    if (form) record.form = form;
    calls.push(record);

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ${record.method} ${url} — no queued response`,
      );
    }
    const next = queue.shift()!;
    const respBody = next.body === undefined
      ? null
      : typeof next.body === "string" || next.body instanceof Uint8Array
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody as BodyInit | null, {
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

/**
 * ElevenLabs' error envelope in the shape observed on the wire — the OBJECT arm
 * (`{"detail": {type, code, …}}`), which is what the API itself returns.
 */
export function errorBody(
  type: string,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    detail: {
      type,
      code,
      message,
      status: code,
      request_id: "0123456789abcdef0123456789abcdef",
      ...extra,
    },
  };
}

/**
 * The other arm: a path the router does not know answers `{"detail": "Not
 * Found"}` — a bare string, not an object. Measured live 2026-08-11.
 */
export function bareDetailBody(message = "Not Found"): Record<string, unknown> {
  return { detail: message };
}

/** An `audio/mpeg` response carrying the given bytes. */
export function audioResponse(bytes: Uint8Array, contentType = "audio/mpeg"): MockResponse {
  return { status: 200, body: bytes, headers: { "content-type": contentType } };
}

/** The query string of a recorded call, as a plain object (repeated keys joined). */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) {
    out[k] = out[k] === undefined ? v : `${out[k]},${v}`;
  }
  return out;
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** The JSON body of a recorded call. */
export function jsonBodyOf(call: CallRecord): Record<string, unknown> {
  if (!call.body) throw new Error("call carried no body");
  return JSON.parse(call.body) as Record<string, unknown>;
}
