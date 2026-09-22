/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockCtx([{ body: page([user]) }]);
 *   await userList.execute({ limit: 5 }, ctx);
 *   assertEquals(pathOf(calls[0].url), "/v2/users");
 *
 * Responses are queued one-per-fetch. An unqueued fetch throws loudly, so a test
 * that makes an unexpected extra request fails instead of hanging.
 */
import type { HookContext } from "@w6w/types";

export const API_ROOT = "https://api.brex.com/v2";

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

/** Brex's list envelope: `{"next_cursor": …, "items": [ … ]}`. */
export function page<T>(items: T[], next_cursor: string | null = null): Record<string, unknown> {
  return { next_cursor, items };
}

/** Brex's error envelope, in the shape its own docs show. */
export function errorBody(type: string, message: string, code?: string): Record<string, unknown> {
  return code ? { type, message, code } : { type, message };
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

/** The JSON body a recorded call sent, parsed. */
export function bodyOf(call: CallRecord): Record<string, unknown> {
  if (!call.body) throw new Error("the recorded call sent no body");
  return JSON.parse(call.body) as Record<string, unknown>;
}

/** A user fixture carrying every documented field. */
export const USER = {
  id: "cu8oi6a6vbc9",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  status: "ACTIVE",
  manager_id: "cu8oi6a6vbc8",
  department_id: "dp_1",
  location_id: "lc_1",
  title_id: "tl_1",
  cost_center_id: "cc_1",
  legal_entity_id: "le_1",
  metadata: { employee_id: "E-1042" },
  remote_display_id: "ada.lovelace",
  custom_fields: [{ key: "cost_owner", value: "finance" }],
} as const;

/** A card fixture carrying every documented field. */
export const CARD = {
  id: "card_1",
  owner: { id: "cu8oi6a6vbc9", type: "USER" },
  status: "ACTIVE",
  last_four: "4242",
  card_name: "Ada Lovelace",
  card_type: "VIRTUAL",
  limit_type: "CARD",
  spend_controls: {
    spend_limit: { amount: 500000, currency: "USD" },
    spend_available: { amount: 499000, currency: "USD" },
    spend_duration: "MONTHLY",
    reason: "Team tools",
  },
  billing_address: { line1: "1 Market St", city: "San Francisco" },
  mailing_address: { line1: "1 Market St", city: "San Francisco" },
  expiration_date: { month: 12, year: 2029 },
  has_been_transferred: false,
  metadata: {},
  budget_id: "budget_1",
  partner: null,
  created_at: "2026-01-04T12:00:00Z",
} as const;
