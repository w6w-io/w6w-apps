/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
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
    const isTextBody = typeof next.body === "string";
    const respBody = next.body === undefined
      ? null
      : isTextBody
      ? next.body
      : JSON.stringify(next.body);
    return Promise.resolve(
      new Response(respBody as BodyInit | null, {
        status: next.status ?? 200,
        statusText: next.statusText ?? "",
        headers: next.headers ?? { "content-type": isTextBody ? "text/html" : "application/json" },
      }),
    );
  };

  const ctx: HookContext = {
    fetch: fetchImpl as unknown as typeof fetch,
    log: (level, message, data) => logs.push({ level, message, data }),
  };

  return { ctx, calls, logs };
}

/** Every action test's Connection: a redacted display carrying no credential. */
export function mockKnackCtx(
  responses: MockResponse[] = [],
  display: Record<string, unknown> = { applicationId: "5f1a1a1a1a1a1a1a1a1a1a1a" },
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.knack",
    auth: "application-key",
    state: "connected",
    createdAt: new Date(0).toISOString(),
    display,
  };
  return mock;
}

/** Knack's "retrieve multiple records" envelope. */
export function recordsPage(
  records: Array<Record<string, unknown>>,
  overrides: Partial<{ total_pages: number; current_page: number; total_records: number }> = {},
): Record<string, unknown> {
  return {
    total_pages: overrides.total_pages ?? 1,
    current_page: overrides.current_page ?? 1,
    total_records: overrides.total_records ?? records.length,
    records,
  };
}
