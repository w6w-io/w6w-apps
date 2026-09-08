import type { HookContext } from "@w6w/types";

/**
 * Vapi REST client — voice-AI infrastructure over `api.vapi.ai`.
 *
 * Everything in this module was verified on 2026-09-06 against Vapi's own
 * machine-readable OpenAPI document (`https://api.vapi.ai/api-json`, fetched
 * live, 2,111,869 bytes, `info.version` `"1.0"`) plus live probes against
 * `api.vapi.ai`. Nothing here came from a third-party integration directory.
 *
 * ## One host, no version prefix
 *
 * The document declares exactly one server, `https://api.vapi.ai`. Most paths
 * carry no version prefix at all (`/assistant`, `/call`, `/tool`, …); a
 * handful of newer resources are namespaced `/v2/...` (`/v2/phone-number`,
 * `/v2/campaign`, `/v2/knowledge-base`) because they replaced an existing v1
 * shape rather than because the whole API versioned up. This app calls
 * `/v2/phone-number` for listing (see {@link VapiClient.paginated}) and the
 * unprefixed host for everything else.
 *
 * ## Auth: bearer, and TWO kinds of key
 *
 * `components.securitySchemes.bearer` is `{"scheme": "bearer", "type":
 * "http"}` — a plain `Authorization: Bearer <token>` header, no custom scheme
 * name. But Vapi issues two keys per project — a **private** key (server-side,
 * full access — this is the one this app's `sign` hook sends) and a
 * **public** key (meant for the client-side Web/`vapi-client-sdk` package,
 * scoped to call-initiation only). Presenting the public key here answers
 * `401` with a body that names the mistake outright — see `auth/private-key.ts`.
 *
 * ## Errors: one shape, and it is Nest's default, not a Vapi-specific one
 *
 * Every failure observed live is `{"message", "error", "statusCode"}` —
 * `message` is a string for most errors but an ARRAY OF STRINGS for a
 * class-validator body-validation failure (one entry per invalid field), and
 * `error` is a short reason phrase ("Unauthorized", "Bad Request", …), not a
 * stable machine code. {@link formatVapiError} joins the array form so a
 * multi-field validation failure doesn't come out as `[object Object]`.
 *
 * ## Pagination: two incompatible shapes on the same host
 *
 * Every list endpoint this app calls except phone numbers answers a **bare
 * JSON array**, paginated by `limit` (default 100, max 1000) plus
 * `createdAtGt/Lt/Ge/Le` / `updatedAtGt/Lt/Ge/Le` date-range filters — there is
 * no offset or cursor. `GET /v2/phone-number`, by contrast, answers
 * `{"results": [...], "metadata": {itemsPerPage, totalItems, currentPage,
 * totalPages, hasNextPage, ...}}` and paginates by `page` number (plus the
 * same date filters). Code that assumes one shape for "list phone numbers"
 * because every other list is a bare array gets `undefined.length`.
 *
 * ## No account/usage endpoint at all
 *
 * The document has no `/org`, `/account`, `/billing` or `/usage` path of any
 * kind, and no response anywhere carries a rate-limit header (checked against
 * every 401 response observed live). There is therefore no quota Health Check
 * here — see `health/quota.ts` for the declared absence.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.vapi.ai";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Pre-serialized body, for the one multipart upload (`file-create`). */
  rawBody?: { contentType: string; text: string };
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

interface VapiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/** Vapi's page-based envelope, returned only by `GET /v2/phone-number`. */
export interface VapiPage<T> {
  results: T[];
  metadata: {
    itemsPerPage: number;
    totalItems: number;
    currentPage: number;
    totalPages?: number;
    hasNextPage?: boolean;
  };
}

/** Drop keys the caller left unset, so an unset filter is never sent as `"undefined"`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host hands a `json` param through in whichever shape it arrived, so
 * both are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Vapi's error body into one actionable line.
 *
 * `error` (the Nest reason phrase) is kept alongside `message` because the two
 * carry different information — `message` says what was wrong, `error` says
 * what class of failure it was — and both are cheap to keep.
 */
export function formatVapiError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: VapiErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as VapiErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (parsed.message === undefined && parsed.error === undefined)) {
    return `Vapi ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const message = Array.isArray(parsed.message) ? parsed.message.join("; ") : parsed.message;
  const parts = [
    `Vapi ${status}${parsed.error ? ` ${parsed.error}` : ""} for ${method} ${path}`,
    message,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * Field names that carry a live credential, wherever they appear in a
 * response. Vapi's own OpenAPI document states `apiKey` fields on a
 * credential DTO are "not returned in the API" — this is defense in depth,
 * not a workaround for a known leak: an Assistant or Call response can embed
 * a `credentials[]` array (dynamic per-call provider credentials) or a
 * `server.credentialId`/webhook `headers` block, and a workflow step's result
 * is persisted and displayed, so anything shaped like a secret is dropped
 * before an Action returns rather than trusted to stay absent forever.
 */
const SECRET_KEY_PATTERN = /^(api[_-]?key|secret|client[_-]?secret|token|password)$/i;

/**
 * Recursively remove {@link SECRET_KEY_PATTERN} keys from a response, without
 * mutating the input. Narrow by key name only — it does not guess at values —
 * so a user's own field that happens to be named `token` in, say, a Squad's
 * `metadata` is exactly as likely to be dropped as a real credential; that
 * trade favours never echoing a secret over preserving an unlikely user field.
 */
export function stripSecrets<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => stripSecrets(v, seen)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) continue;
    out[key] = stripSecrets(v, seen);
  }
  return out as T;
}

export class VapiClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body of a bare-array or bare-object response. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.rawBody) {
      headers["content-type"] = options.rawBody.contentType;
      init.body = options.rawBody.text;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatVapiError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
