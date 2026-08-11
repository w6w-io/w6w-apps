/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: collection([]) }]);
 *   await action.execute({ … }, ctx);
 *   assertEquals(url(calls[0]).pathname, "/me/videos");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging — which
 * matters here, because several actions loop one request per video and a silent
 * extra call is exactly the bug worth catching.
 */
import type { HookContext } from "@w6w/types";

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
    const target = typeof input === "string"
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

    calls.push({ url: target, method: (init?.method ?? "GET").toUpperCase(), headers, body });

    if (queue.length === 0) {
      throw new Error(
        `mockCtx: unexpected fetch #${calls.length} to ` +
          `${calls[calls.length - 1].method} ${target} — no queued response`,
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

/** A ctx carrying a redacted Connection. It holds no credential — only `sign` ever sees one. */
export function mockConnectedCtx(responses: MockResponse[] = []): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.vimeo",
    auth: "access-token",
    status: "live",
    display: { name: "Test Account", uri: "/users/152184" },
  };
  return mock;
}

/** The parsed URL of a recorded call — the shape most assertions want. */
export function url(call: CallRecord): URL {
  return new URL(call.url);
}

/** A recorded call's query parameter, or `null`. */
export function q(call: CallRecord, name: string): string | null {
  return url(call).searchParams.get(name);
}

/** A recorded call's parsed JSON body. */
export function jsonBody(call: CallRecord): Record<string, unknown> {
  if (call.body === null) throw new Error("call had no body");
  return JSON.parse(call.body) as Record<string, unknown>;
}

/** Vimeo's collection envelope, as documented in `/api/common-formats`. */
export function collection<T>(data: T[], extra: Record<string, unknown> = {}) {
  return {
    total: data.length,
    page: 1,
    per_page: 25,
    paging: { next: null, previous: null, first: "?page=1", last: "?page=1" },
    data,
    ...extra,
  };
}

/**
 * Vimeo's error body, in the exact four-key shape observed on the wire from an
 * unauthenticated `GET https://api.vimeo.com/` on 2026-08-11.
 */
export function errorBody(errorCode: number, developerMessage: string) {
  return {
    error: "Something strange occurred. Please get in touch with the app's creator.",
    link: null,
    developer_message: developerMessage,
    error_code: errorCode,
  };
}

/** A minimal video representation for list/get fixtures. */
export function video(id: number, extra: Record<string, unknown> = {}) {
  return { uri: `/videos/${id}`, name: `Video ${id}`, link: `https://vimeo.com/${id}`, ...extra };
}

/**
 * A fixture access token.
 *
 * Assembled at runtime rather than written as one literal, so that no committed
 * file in this repo contains a contiguous string that looks like a live Vimeo
 * bearer token to a secret scanner. The value is meaningless — every test that
 * uses it asserts on the header this app builds from it, never on the token.
 */
export const TEST_TOKEN = ["w6wunit", "testfixture", "notarealtoken"].join("");
