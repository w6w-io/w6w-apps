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

/** The server every action test addresses. */
export const SITE_URL = "https://mattermost.example.com";

/**
 * Mattermost's client resolves the server origin from the Connection, so an
 * action test needs a ctx carrying one. It holds no credential — the credential
 * is only ever visible to `sign`.
 */
export function mockMattermostCtx(
  responses: MockResponse[] = [],
  siteUrl: string = SITE_URL,
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.mattermost",
    auth: "access-token",
    status: "live",
    display: {
      siteUrl,
      site: { host: new URL(siteUrl).host },
      user: { id: "u1", username: "w6w-bot", roles: "system_user" },
      server: { version: "11.11.0" },
    },
  };
  return mock;
}

/**
 * Mattermost's post-list envelope, in the shape the server actually returns:
 * `order` carries the display order and `posts` is a map keyed by id.
 */
export function postList(ids: string[]): Record<string, unknown> {
  return {
    order: ids,
    posts: Object.fromEntries(ids.map((id) => [id, { id, message: `message ${id}` }])),
    next_post_id: "",
    prev_post_id: "",
    has_next: false,
  };
}

/** Mattermost's error body, in the exact shape observed on the wire. */
export function errorBody(id: string, message: string, status = 401): Record<string, unknown> {
  return {
    id,
    message,
    detailed_error: "",
    request_id: "w45fxn5zuibtix469g9pdd8a8h",
    status_code: status,
  };
}

/** A token fixture. Mattermost tokens are 26-character alphanumerics. */
export const TOKEN = "9xuqwrwgstrb3mzrxb83nb357a";
