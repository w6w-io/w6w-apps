import type { HookContext } from "@w6w/types";

/**
 * FreeAgent's Company API — a single fixed host (unlike the Accountancy
 * Practice API, which is out of scope for this app; see `dev.freeagent.com/docs/
 * accountancy_practice_api`). Confirmed against `dev.freeagent.com/docs/introduction`:
 * "All API access is over HTTPS and accessed from api.freeagent.com."
 */
export const API_URL = "https://api.freeagent.com/v2";

/**
 * FreeAgent references a related resource (contact, project, task, user, bank
 * account, invoice, …) by its FULL API URL, never a bare numeric id — e.g. a
 * timeslip's `task` field is `"https://api.freeagent.com/v2/tasks/2"`, not
 * `2` (confirmed on every create/update payload in the Contacts, Projects,
 * Tasks, Timeslips and Invoices docs). Every action param that names a related
 * resource therefore takes a bare id and this helper builds the URL the API
 * actually expects — passing a raw id through would fail validation with an
 * opaque 422.
 */
export function ref(resource: string, id: string | number): string {
  return `${API_URL}/${resource}/${id}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset so a merge doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Parse the "Additional fields" JSON param into a plain object. Rejects
 * anything that is not an object, so a typo fails here rather than as an
 * opaque 422 from FreeAgent.
 */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Parse a JSON param into an array (invoice/bill line items). Rejects
 * anything that is not an array, so a typo fails here rather than as an
 * opaque 422 from FreeAgent.
 */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

interface FreeAgentErrorBody {
  error?: string;
  errors?: Array<{ message?: string }> | { message?: string };
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which injects the
 * bearer token (see `auth/oauth2.ts`).
 */
export class FreeAgentClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
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
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const body = JSON.parse(text) as FreeAgentErrorBody;
        if (typeof body.error === "string") {
          detail = body.error;
        } else if (Array.isArray(body.errors)) {
          detail = body.errors.map((e) => e.message).filter(Boolean).join("; ") || text;
        } else if (body.errors?.message) {
          detail = body.errors.message;
        }
      } catch { /* keep the raw body */ }
      throw new Error(`FreeAgent ${res.status} for ${init.method} ${url.pathname}: ${detail}`);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
