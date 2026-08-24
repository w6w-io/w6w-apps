import type { HookContext } from "@w6w/types";

/**
 * Browse AI API v2 REST client.
 *
 * Everything in this module was verified on 2026-08-24 against Browse AI's own
 * machine-readable OpenAPI 3.1 document — embedded in the Scalar reference
 * renderer served at `docs.browse.ai/api/` (315,197 bytes of HTML; the spec
 * itself is inlined as a `Scalar.createApiReference()` call argument, `info.version`
 * `"v2"`) — plus live probes against `api.browse.ai`. Nothing here came from a
 * third-party integration directory.
 *
 * ## One host, one envelope shape — almost
 *
 * Every response is JSON with a `statusCode` and `messageCode`, unlike Apify's
 * three wire shapes. But the **payload key differs by endpoint family**, and
 * getting that wrong is the single most common way an integration against this
 * API breaks:
 *
 *  - **Robots, monitors, webhooks, cookies** answer `{statusCode, messageCode,
 *    <resource-name>: …}` — the payload sits directly under a key named after
 *    the resource (`robot`, `robots`, `monitor`, `monitors`, `webhook`,
 *    `webhooks`, `cookies`).
 *  - **Tasks and bulk runs** answer `{statusCode, messageCode, result: …}` — the
 *    SAME payload, but wrapped one level deeper under a generic `result` key.
 *
 * There is no way to guess which shape an endpoint uses from its verb or path;
 * it was read off the OpenAPI document's response schema for every operation
 * (`RobotTask`, `BulkRun` and their list wrappers nest under `result`; `Robot`,
 * `Monitor` and `Webhook` do not). See each action for the exact key it reads.
 *
 * ## Errors
 *
 * Every failure is `{"statusCode": <4xx|5xx>, "messageCode": "<code>"}`, and a
 * validation failure on `PATCH /robots/{id}/cookies` additionally carries
 * `errors: [{name?, summary, fields}]`. `messageCode` is a stable machine code
 * (`invalid_robot_id`, `body_parse_error`, `credits_limit_reached`,
 * `robot_under_maintenance`, …) and is surfaced verbatim by
 * {@link formatBrowseAiError}, because the fix differs per code and a flattened
 * "HTTP 400" hides which one was hit.
 *
 * ## No documented rate limits
 *
 * The OpenAPI document states no request-rate ceiling anywhere, and a live 401
 * response carries no `X-RateLimit-*`/`RateLimit-*` header of any kind (checked
 * 2026-08-24). The one metered thing this API exposes is **task-run credits**,
 * surfaced only as a `403 credits_limit_reached` refusal at the moment you run
 * out — there is no balance endpoint to read in advance. See `health/quota.ts`.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.browse.ai/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface BrowseAiErrorBody {
  statusCode?: number;
  messageCode?: string;
  errors?: Array<{ name?: string; summary?: string; fields?: unknown }>;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `includeRetried=false` and `page=0` are both
 * meaningful, and silently dropping them would make them impossible to send.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
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

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Browse AI's error body into one actionable line.
 *
 * `messageCode` is kept because it is the only thing distinguishing, say, a
 * malformed robot id (`invalid_robot_id`, fixable by the caller) from an
 * exhausted plan (`credits_limit_reached`, not fixable by retrying) from a
 * robot mid-training (`robot_under_maintenance`, fixable by waiting) — all of
 * which a bare status code collapses into indistinguishable failures.
 */
export function formatBrowseAiError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: BrowseAiErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as BrowseAiErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const code = parsed?.messageCode;
  if (!code) return `Browse AI ${status} for ${method} ${path}: ${truncate(raw)}`;

  const fieldErrors = (parsed?.errors ?? [])
    .flatMap((e) =>
      Array.isArray(e.fields)
        ? (e.fields as Array<{ field?: string; message?: string }>).map((f) =>
          `${e.name ? `${e.name}.` : ""}${f.field}: ${f.message}`
        )
        : []
    );

  const parts = [
    `Browse AI ${status} ${code} for ${method} ${path}`,
    fieldErrors.length > 0 ? fieldErrors.join("; ") : undefined,
    status === 403 && code === "credits_limit_reached"
      ? "the account has run out of task-run credits for this billing period"
      : undefined,
    status === 503 && code === "robot_under_maintenance"
      ? "the robot is being retrained or updated and cannot run tasks right now; retry later"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class BrowseAiClient {
  constructor(private ctx: HookContext) {}

  /** Parse the JSON body of a successful response. Every endpoint answers JSON. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
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

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatBrowseAiError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
