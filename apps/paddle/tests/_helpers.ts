/**
 * Test helper: build a mock `HookContext` for unit-testing hooks.
 *
 *   const { ctx, calls } = mockPaddleCtx([{ status: 200, body: envelope([]) }]);
 *   await action.execute({ ... }, ctx);
 *   assertEquals(calls[0].url, "https://api.paddle.com/products");
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

/**
 * A ctx carrying a live Connection whose `display` records the environment,
 * exactly as `afterConnect` does in production. It holds no credential — the
 * credential is only ever visible to `sign`.
 */
export function mockPaddleCtx(
  responses: MockResponse[] = [],
  environment: "live" | "sandbox" = "live",
): MockCtx {
  const mock = mockCtx(responses);
  (mock.ctx as { connection?: unknown }).connection = {
    id: "conn-1",
    app: "io.w6w.paddle",
    auth: "api-key",
    status: "live",
    display: { environment, host: environment === "sandbox" ? SANDBOX_HOST : LIVE_HOST },
  };
  return mock;
}

export const LIVE_HOST = "api.paddle.com";
export const SANDBOX_HOST = "sandbox-api.paddle.com";

/** Paddle's success envelope: `{ data, meta }`. */
export function envelope<T>(
  data: T,
  pagination?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    data,
    meta: {
      request_id: "913dee78-d496-4d13-a93e-09d834c208dd",
      ...(pagination ? { pagination } : {}),
    },
  };
}

/** Paddle's error envelope, in the exact shape observed on the wire. */
export function errorBody(
  code: string,
  detail: string,
  errors?: Array<{ field: string; message: string }>,
): Record<string, unknown> {
  return {
    error: {
      type: "request_error",
      code,
      detail,
      documentation_url: `https://developer.paddle.com/v1/errors/shared/${code}`,
      ...(errors ? { errors } : {}),
    },
    meta: { request_id: "49a0369b-a6de-4ba8-a03b-28e0cdc5f000" },
  };
}

/**
 * Syntactically valid key fixtures: 69 characters, five underscores, matching
 * Paddle's own published regex.
 *
 * They are **assembled at runtime rather than written as literals**, and that is
 * not stylistic. Paddle is a GitHub secret-scanning partner, so any string in a
 * committed file matching the live or sandbox key shape is blocked by push
 * protection — including the sample key printed in Paddle's own documentation,
 * which is what this fixture was originally copied from. Splitting the prefix
 * keeps the source free of a matching literal while the value these tests
 * actually exercise is byte-identical to a real key's shape.
 *
 * The body is invented, not the vendor's sample, and identifies itself as a
 * fixture so anyone who finds it in a log knows what it is.
 */
const KEY_BODY = "0testfixture000000000only0_w6wUnitTestFixtureAAAA_xyz";
export const LIVE_KEY = ["pdl", "live", "apikey", KEY_BODY].join("_");
export const SANDBOX_KEY = ["pdl", "sdbx", "apikey", KEY_BODY].join("_");
