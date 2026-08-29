import type { HookContext } from "@w6w/types";

/**
 * Onfleet's v2 API — verified against `docs.onfleet.com/reference/*` (read
 * 2026-08-29) and probed live the same day (`status.onfleet.com`,
 * `/auth/test`'s response shape).
 *
 * ## Auth is HTTP Basic with a blank password
 *
 * Confirmed against `docs.onfleet.com/reference/authentication`: "A valid key
 * must be provided with every request, via HTTP basic access authentication,
 * where the key string is the **username** of the request, and the
 * **password** is blank." There is no OAuth, no bearer header — the key IS
 * the whole credential, sent as `Basic base64(key + ":")`.
 *
 * ## Bodies are sent bare, not wrapped in a type key
 *
 * Unlike some REST APIs that expect `{"task": {...}}`, Onfleet accepts the
 * object directly: `POST /tasks` takes `{"destination": ..., ...}` at the top
 * level. No wrapping helper is needed here.
 *
 * ## The container model
 *
 * Every task belongs to exactly one **container** — an organization, a team,
 * or a worker — which is an ordered list of tasks. Creating a task without a
 * `container` puts it in the creating organization's own container
 * (unassigned). Assigning it to a worker or team is done by setting
 * `container` at creation, or via the Update task endpoint afterwards.
 *
 * ## Errors carry a `code` and a nested (or bare string) `message`
 *
 * ```json
 * {"code": "InvalidCredentials", "message": {"error": 1102, "message": "...", "cause": "...", "request": "..."}}
 * ```
 * Some routes answer with `message` as a bare string instead of an object
 * (`{"code": "MethodNotAllowed", "message": "GET is not allowed"}`) — the
 * error formatter here handles both shapes.
 */
export const BASE_URL = "https://onfleet.com";
export const API_PATH = "/api/v2";

/** Onfleet limits every organization to 20 requests per second, across all its API keys. */
export const RATE_LIMIT_PER_SECOND = 20;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** The object to send, JSON-encoded and sent bare (no wrapper key). */
  body?: Record<string, unknown>;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset, so an omitted field stays omitted. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * A destination or recipient, given either inline (JSON object) or by
 * existing Onfleet id (plain string). Onfleet accepts both everywhere a
 * destination/recipient is referenced — a warehouse shipping all day should
 * create its destination once and pass the id.
 */
export function entityRef(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return undefined;
    // A bare Onfleet id, not JSON — parsing it first would fail on a
    // perfectly good id string.
    if (!/^[{[]/.test(text)) return text;
    return json(text, field);
  }
  return value;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class OnfleetClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { res } = await this.raw(path, options);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Onfleet ${res.status} for ${options.method ?? "GET"} ${path}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 200 && !text) return undefined as T;
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Like `request`, but hands back the raw `Response` too — for reading headers. */
  async raw(path: string, options: RequestOptions = {}): Promise<{ res: Response }> {
    const url = new URL(`${BASE_URL}${API_PATH}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    return { res };
  }
}

/**
 * Turn an Onfleet error body into something actionable.
 *
 * `message` is usually an object (`{error, message, cause, request}`) but is
 * sometimes a bare string (`MethodNotAllowed`) — both are handled.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      code?: string;
      message?: string | { error?: number; message?: string; cause?: string; request?: string };
    };
    if (typeof body.message === "string") {
      detail = body.code ? `${body.message} (${body.code})` : body.message;
    } else if (body.message) {
      const parts = [body.message.message ?? body.code ?? detail];
      if (body.message.cause) parts.push(`— ${body.message.cause}`);
      if (body.message.request) parts.push(`[request ${body.message.request}]`);
      detail = parts.join(" ");
    }
  } catch { /* not JSON */ }

  if (status === 401 || status === 403) {
    return `${detail} — check the API key. A key that was valid at connect time can still be ` +
      "revoked or deactivated later";
  }
  if (status === 429) {
    return `${detail} — Onfleet allows ${RATE_LIMIT_PER_SECOND} requests per second across all ` +
      "of the organization's API keys combined; slow down and retry";
  }
  if (status === 412) {
    return `${detail} — a container (organization/team/worker task list) was locked by a ` +
      "concurrent update; retry serially rather than in parallel";
  }
  return detail || `${status}`;
}
