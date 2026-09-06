import type { HookContext, Param } from "@w6w/types";

/**
 * Nutshell CRM — JSON-RPC 2.0 over a single HTTP endpoint.
 *
 * ## The shape, verified on the wire
 *
 * Every operation is `POST https://app.nutshell.com/api/v1/json` with a body
 * of `{ "jsonrpc": "2.0", "id": <any>, "method": "<name>", "params": {...} }`.
 * There is no REST-style routing — `method` picks the operation and `params`
 * is a named-argument object (Nutshell's own docs: "Nutshell uses JSON-RPC
 * v2.0 and supports named parameters"). This app only speaks this legacy
 * JSON-RPC surface; Nutshell also ships a newer REST API
 * (`developers.nutshell.com`) that is a *separate* product surface with
 * different auth scoping notes and is out of scope here.
 *
 * Confirmed live 2026-09-06 against Nutshell's own public API sandbox
 * (`jim@demo.nutshell.com`, documented at
 * https://developers.nutshell.com/docs/api-authentication):
 *
 *   - A successful call answers **HTTP 200** with `{"result": ..., "id":
 *     ..., "jsonrpc":"2.0"}` — there is no `"error"` key at all on success,
 *     not even `null` (some of Nutshell's own docs show `"error": null`,
 *     but the live response omits the key entirely).
 *   - A rejected credential answers **HTTP 401** with a JSON-RPC error
 *     envelope in the body too: `{"error":{"code":401,"message":"API key
 *     not found","data":null},...}`. So unlike some JSON-RPC APIs, a bad
 *     credential here is NOT a 200 wearing an error object — it is a real
 *     401 that *also* carries a structured body. Both must be checked: the
 *     body is authoritative for the message, the status is a fast path for
 *     "was this even a JSON-RPC-shaped failure".
 *   - An unknown method answers **HTTP 404** with
 *     `{"error":{"code":-32601,"message":"Method not found","data":null}}`
 *     — the standard JSON-RPC 2.0 method-not-found code, but on a 404
 *     rather than the 200 the JSON-RPC spec's own examples use.
 *   - A stale `rev` on an edit answers **HTTP 409** with
 *     `{"error":{"code":409,"message":"rev key is out-of-date","data":null}}`.
 *
 * The pattern across all three failure cases: Nutshell's HTTP status code
 * tracks the JSON-RPC error, so status is a reliable *hint* here — but the
 * body is still read and is what a caller should show a human, since the
 * status alone doesn't carry the message.
 *
 * ## Revs: mandatory optimistic concurrency on every edit
 *
 * `get*`/`find*` responses carry a `rev` (a string, even though it looks
 * like an incrementing integer — Nutshell's own docs warn not to assume
 * that). Every `edit*` method requires the `rev` you last read, and Nutshell
 * refuses the write with the 409 above if the record changed since. Passing
 * the literal string `"REV_IGNORE"` bypasses the check (documented, but
 * flagged by Nutshell itself as something to "exercise caution" with) — not
 * exposed as a convenience default by this app's update actions, since
 * silently clobbering concurrent edits is exactly the failure revs exist to
 * prevent.
 *
 * ## Stubs
 *
 * `find*` methods return "stub" entities by default (`stubResponses: true`)
 * — a small subset of fields, marked `"stub": true` — for bandwidth. Passing
 * `stubResponses: false` returns full entities at a documented cost: full,
 * non-stub `find*` responses are the one thing Nutshell explicitly rate-limits.
 */

export const API_URL = "https://app.nutshell.com/api/v1/json";

/** Nutshell's JSON-RPC error object. */
export interface NutshellRpcError {
  code?: number;
  message?: string;
  data?: unknown;
}

export interface NutshellRpcResponse<T = unknown> {
  jsonrpc?: string;
  id?: string | number | null;
  result?: T;
  error?: NutshellRpcError;
}

/** Build the JSON-RPC 2.0 request body. A constant `id` is fine — see `Core::call`'s note. */
export function buildRpcBody(
  method: string,
  params: Record<string, unknown> = {},
): string {
  return JSON.stringify({ jsonrpc: "2.0", id: "1", method, params });
}

/**
 * Turn a JSON-RPC response into its `result`, or throw with Nutshell's own
 * error message.
 *
 * Checks the BODY, not just the status: a 401 and a 409 both carry a
 * structured `error` object here (verified live, see the module doc above),
 * so `body.error` is read first regardless of what the status code was, and
 * only a body that fails to parse as JSON falls back to a status-only
 * message.
 */
export function unwrapRpc<T>(status: number, text: string): T {
  let body: NutshellRpcResponse<T>;
  try {
    body = JSON.parse(text) as NutshellRpcResponse<T>;
  } catch {
    const snippet = text.slice(0, 200);
    throw new Error(
      `Nutshell returned a non-JSON response (HTTP ${status}) from ${API_URL}: ${snippet}`,
    );
  }

  if (body.error) {
    const { code, message } = body.error;
    throw new Error(`Nutshell error ${code ?? status}: ${message ?? "no message"}`);
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Nutshell returned HTTP ${status} with no JSON-RPC error object`);
  }

  return body.result as T;
}

/**
 * Thin wrapper over `ctx.fetch` for the JSON-RPC endpoint.
 *
 * Never reads a credential and never sets an `Authorization` header — that is
 * `sign`'s job (see `../auth/basic.ts`), which the runtime applies to every
 * request this client emits.
 */
export class NutshellClient {
  constructor(private ctx: HookContext) {}

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: buildRpcBody(method, params),
    });
    return unwrapRpc<T>(res.status, await res.text());
  }
}

// --- shared entity/param fragments -----------------------------------------

/** A stub or full Nutshell entity — the shape common to every response. */
export interface NutshellEntity {
  id?: number | string;
  entityType?: string;
  rev?: string;
  name?: string;
  stub?: boolean;
  [key: string]: unknown;
}

/** Drop `undefined`/`""` keys so an optional field is never sent as `null`/empty. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out as Partial<T>;
}

/** Coerce an id param (form values may arrive as strings) into what Nutshell expects. */
export function toId(id: unknown): number | string {
  if (typeof id === "number") return id;
  const trimmed = String(id ?? "").trim();
  if (!trimmed) throw new Error("id is required");
  const n = Number(trimmed);
  return Number.isFinite(n) && /^-?\d+$/.test(trimmed) ? n : trimmed;
}

/**
 * Parse the free-form JSON param every create/update action exposes for
 * fields this app does not name explicitly (custom fields, less-common
 * relationships). Merged OVER the typed fields, so it can also override them.
 */
export function parseJsonObject(raw: unknown, label: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`${label} is not valid JSON: ${raw}`);
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** Shared pagination params every `find*` action reuses, verified against `Core::findLeads` et al. */
export const ORDER_BY_PARAM: Param = {
  key: "orderBy",
  label: "Order by",
  type: "string",
  hint: "Field to sort by. Each find method has its own default (usually `name` or `id`).",
  advanced: true,
};

export const ORDER_DIRECTION_PARAM: Param = {
  key: "orderDirection",
  label: "Order direction",
  type: "select",
  options: [
    { value: "ASC", label: "Ascending" },
    { value: "DESC", label: "Descending" },
  ],
  default: "ASC",
  advanced: true,
};

export const LIMIT_PARAM: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 50,
  hint: "Results per page. Max 100 when Full records is enabled.",
  advanced: true,
};

export const PAGE_PARAM: Param = {
  key: "page",
  label: "Page",
  type: "number",
  default: 1,
  advanced: true,
};

export const STUB_RESPONSES_PARAM: Param = {
  key: "fullRecords",
  label: "Full records",
  type: "boolean",
  default: false,
  hint: 'Nutshell returns compact "stub" records by default. Enable to fetch full entities — ' +
    "Nutshell rate-limits this more aggressively than stub responses, per its own API docs.",
  advanced: true,
};

/** Common pagination args shared by every `find*` action's `execute`. */
export interface FindInput {
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
  limit?: number;
  page?: number;
  fullRecords?: boolean;
}

export function findParams(input: FindInput): Record<string, unknown> {
  return compact({
    orderBy: input.orderBy,
    orderDirection: input.orderDirection,
    limit: input.limit,
    page: input.page,
    // `stubResponses` is Nutshell's own name; `fullRecords` is this app's more
    // legible framing of the same boolean, inverted.
    stubResponses: input.fullRecords === true ? false : undefined,
  });
}

export const REV_PARAM: Param = {
  key: "rev",
  label: "Rev",
  type: "string",
  required: true,
  hint: "The `rev` value from the last time you read this record (e.g. via Get or Find). " +
    "Nutshell rejects the update with a 409 if the record changed since, to prevent clobbering " +
    "a concurrent edit.",
};

export const VALUES_PARAM: Param = {
  key: "values",
  label: "Additional fields",
  type: "json",
  hint: "JSON object of any other Nutshell field to set, e.g. custom fields under " +
    '`{"customFields": {"Budget": {"currency": "USD", "amount": "500"}}}`. Merged over the ' +
    "named fields above, so it can also override them.",
};
