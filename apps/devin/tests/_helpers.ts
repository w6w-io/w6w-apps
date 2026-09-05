/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ status: 200, body: { session_id: "devin-1" } }]);
 *   await sessionGet.execute({ devinId: "devin-1" }, ctx);
 *   assertEquals(calls[0].url, "https://api.devin.ai/v3/organizations/org-test/sessions/devin-1");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a
 * test that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const ORG_ID = "org-test0000000000";
export const API_ROOT = `https://api.devin.ai/v3/organizations/${ORG_ID}`;

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

/** A ctx with a Connection carrying `orgId` in its display data, as `afterConnect` would leave it. */
export function mockCtx(
  responses: MockResponse[] = [],
  orgId: string | undefined = ORG_ID,
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
      : `[${(init.body as { constructor?: { name?: string } })?.constructor?.name ?? "body"}]`;

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
    ...(orgId
      ? { connection: { display: { orgId } } as unknown as HookContext["connection"] }
      : {}),
  };

  return { ctx, calls, logs };
}

/** Devin's RFC 9457 `application/problem+json` error body, in the shape observed on the wire. */
export function problemBody(
  status: number,
  title: string,
  detail?: string,
): Record<string, unknown> {
  return { type: "about:blank", title, status, detail: detail ?? title, instance: "/v3/self" };
}

/** The query string of a recorded call, as a plain object of possibly-repeated values. */
export function queryOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URL(url).searchParams) out[k] = v;
  return out;
}

/** All values for a possibly-repeated query key. */
export function queryAllOf(url: string, key: string): string[] {
  return new URL(url).searchParams.getAll(key);
}

/** The path of a recorded call, without the query string. */
export function pathOf(url: string): string {
  return new URL(url).pathname;
}
