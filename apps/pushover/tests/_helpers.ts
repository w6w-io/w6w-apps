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

/**
 * A ctx carrying a live Connection. Pushover's client needs nothing from the
 * Connection — the host is fixed and the credential is injected by `sign` — so
 * the display block carries only the device count `afterConnect` records.
 */
export function mockPushoverCtx(responses: MockResponse[] = []): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.pushover",
    auth: "app-token",
    status: "live",
    display: { user: { devices: 2 } },
  };
  return mock;
}

/** Pushover's success envelope. */
export function ok(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { status: 1, request: "647d2300-702c-4b38-8b2f-d56326ae460b", ...extra };
}

/** Pushover's failure envelope, in the exact shape observed on the wire. */
export function failure(
  errors: string[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { status: 0, request: "5042853c-402d-4a18-abcb-168734a801de", errors, ...extra };
}

/**
 * The example credentials from Pushover's own documentation — published
 * placeholders that the vendor states will not work against the live API.
 */
export const TOKEN = "azGDORePK8gMaC0QOYAMyEEuzJnyUi";
export const USER = "uQiRzpo4DXghDmr9QzzfQu27cmVRsG";
