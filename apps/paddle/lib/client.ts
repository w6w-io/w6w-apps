import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Paddle Billing REST client.
 *
 * Everything in this module was verified against Paddle's own developer
 * documentation on 2026-08-10, fetched as machine-readable Markdown from
 * `developer.paddle.com/llms/api-reference.txt` and the per-endpoint `.md`
 * pages it links, plus live probes against `api.paddle.com`.
 *
 * ## This is Paddle *Billing*, not Paddle Classic
 *
 * Paddle ships two generations of API and they are not compatible:
 *
 *  - **Paddle Billing** — `api.paddle.com`, bearer API keys, entities prefixed
 *    with `pro_` / `pri_` / `ctm_` / `sub_` / `txn_`, `data`/`meta` envelopes,
 *    cursor pagination. This is the current product and what this app targets.
 *  - **Paddle Classic** — `vendors.paddle.com/api/2.0/…`, a `vendor_id` +
 *    `vendor_auth_code` form-encoded scheme, `{success, response}` envelopes.
 *    Legacy. n8n's Paddle node is Classic, so it is NOT a reference for
 *    anything here.
 *
 * A Classic credential cannot authenticate a Billing request and vice versa,
 * which is why `auth/api-key.ts` validates the key's shape before it is ever
 * sent.
 *
 * ## The environment lives in the key, and so does the host
 *
 * Paddle runs two independent environments with separate hosts and separate
 * data:
 *
 *   | Environment | API host                   | Key prefix          |
 *   | ----------- | -------------------------- | ------------------- |
 *   | Live        | `api.paddle.com`           | `pdl_live_apikey_…` |
 *   | Sandbox     | `sandbox-api.paddle.com`   | `pdl_sdbx_apikey_…` |
 *
 * The key states which environment it belongs to, so the user is never asked to
 * pick one — getting that pair wrong is a silent 403 against the wrong dataset.
 * The host is therefore resolved from the credential itself in `sign` (the only
 * hook that holds it), exactly as `apps/mailchimp` derives its datacenter. This
 * module builds every request against a placeholder host that `sign` rewrites;
 * see {@link PLACEHOLDER_BASE}. It also reads `display.environment` when the
 * Connection has one, so a request logged before signing shows the right host.
 *
 * ## Envelopes
 *
 * Every successful response is `{ data, meta }` — `data` is the entity for a
 * get/create/update and an array for a list, and `meta` carries `request_id`
 * plus (on lists) `pagination`. Deletes answer `204` with no body. Errors
 * replace `data` with an `error` object carrying `type`, `code`, `detail` and
 * `documentation_url`, and a `400` adds a per-field `errors` array. All of that
 * is surfaced by {@link PaddleClient.request} rather than flattened into a
 * generic "HTTP 400".
 */

/**
 * The host every request is built against before `sign` rewrites it.
 *
 * It is the live host rather than a fake one on purpose: if `sign` is somehow
 * bypassed the request fails with a Paddle 403 (no credential) rather than a
 * DNS error against a host that does not exist, and it never silently reaches
 * an unrelated server. `network.allow` lists both real hosts.
 */
export const PLACEHOLDER_BASE = "https://api.paddle.com";

export const LIVE_HOST = "api.paddle.com";
export const SANDBOX_HOST = "sandbox-api.paddle.com";

export type PaddleEnvironment = "live" | "sandbox";

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface PaddleConnectionDisplay {
  /** `live` or `sandbox`, derived from the API key prefix at connect time. */
  environment?: PaddleEnvironment;
}

/**
 * Paddle's documented API-key format:
 *
 *     pdl_<live|sdbx>_apikey_<26 lowercase alnum>_<22 alnum>_<3 alnum>
 *
 * — 69 characters with five underscores, per the vendor's authentication guide,
 * which publishes this regex verbatim. It matters here because the
 * `live`/`sdbx` segment is what selects the host.
 *
 * The example key from that guide is deliberately **not** reproduced anywhere in
 * this app. Paddle participates in GitHub's secret-scanning partner programme,
 * so any literal matching this shape — including the vendor's own documentation
 * sample — is blocked by push protection. That is the feature working correctly,
 * and it is why `tests/_helpers.ts` assembles its fixtures at runtime instead of
 * pasting one in.
 */
export const API_KEY_PATTERN = /^pdl_(live|sdbx)_apikey_[a-z\d]{26}_[a-zA-Z\d]{22}_[a-zA-Z\d]{3}$/;

/**
 * Keys created before 2025-05-06 are "legacy": 50 lowercase alphanumerics with
 * no prefix, so they carry no environment marker at all. Paddle says to revoke
 * and replace them. They are recognised only so the user gets told exactly that
 * instead of a shapeless validation failure.
 */
export const LEGACY_API_KEY_PATTERN = /^[a-z\d]{50}$/;

/**
 * Which environment a key belongs to.
 *
 * Returns `undefined` for a legacy key — it genuinely does not say, and
 * guessing `live` would point sandbox traffic at production. Callers treat
 * `undefined` as "assume live but say so", never as "silently pick one".
 */
export function environmentFromApiKey(apiKey: string): PaddleEnvironment | undefined {
  if (apiKey.startsWith("pdl_live_")) return "live";
  if (apiKey.startsWith("pdl_sdbx_")) return "sandbox";
  return undefined;
}

export function hostForEnvironment(environment: PaddleEnvironment | undefined): string {
  return environment === "sandbox" ? SANDBOX_HOST : LIVE_HOST;
}

/** Read the environment off the redacted Connection. Never touches the credential. */
export function environmentFromConnection(
  connection: RedactedConnection | undefined,
): PaddleEnvironment | undefined {
  const display = (connection?.display ?? {}) as PaddleConnectionDisplay;
  return display.environment === "sandbox" || display.environment === "live"
    ? display.environment
    : undefined;
}

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Paddle's pagination block, returned in `meta.pagination` on every list. */
export interface PaddlePagination {
  per_page?: number;
  next?: string;
  has_more?: boolean;
  /**
   * Exact for datasets of ≤100,000 matches; `100001` for anything larger;
   * `-1` when counting was skipped. Paddle's own guidance is to page with
   * `has_more`/`next` rather than trusting this for an exact count.
   */
  estimated_total?: number;
}

export interface PaddleEnvelope<T> {
  data: T;
  meta?: { request_id?: string; pagination?: PaddlePagination };
}

interface PaddleErrorBody {
  error?: {
    type?: string;
    code?: string;
    detail?: string;
    documentation_url?: string;
    errors?: Array<{ field?: string; message?: string }>;
  };
  meta?: { request_id?: string };
}

/**
 * Drop keys the caller left unset.
 *
 * Paddle's update endpoints are `PATCH` and apply exactly the keys present in
 * the body, so forwarding a key the user never filled in would overwrite a real
 * value with a blank. `false` and `0` survive: `"active"`/`"archived"` status
 * flips and zero amounts are both meaningful, and dropping them would make them
 * impossible to express.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Normalise a `multiselect` param into a list.
 *
 * A multiselect normally arrives as an array, but the host may pass a single
 * selection as a bare string, and an upstream step may produce a comma-joined
 * one. Paddle's array-valued query parameters are all comma-separated
 * (`?status=active,archived`), so every shape ends up in the same place.
 */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
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

/** Keep an error message readable — a validation body can list many fields. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Paddle's error body into one actionable line.
 *
 * The vendor's `detail` is the useful half ("Entity pro_01… not found"), and a
 * `400` additionally names each offending field. Both are surfaced verbatim;
 * neither can carry credential material, since the credential never enters this
 * module and the fields are the caller's own input.
 *
 * `meta.request_id` is included because Paddle support asks for it by name and
 * it is the only way to find the call in their logs afterwards.
 */
export function formatPaddleError(status: number, method: string, path: string, raw: string) {
  let parsed: PaddleErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PaddleErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Paddle ${status} for ${method} ${path}: ${truncate(raw)}`;

  const fields = (err.errors ?? [])
    .map((e) => `${e.field ?? "?"}: ${e.message ?? "invalid"}`)
    .join("; ");
  const parts = [
    `Paddle ${status} ${err.code ?? err.type ?? "error"} for ${method} ${path}`,
    err.detail,
    fields && `fields — ${fields}`,
    parsed?.meta?.request_id && `request_id ${parsed.meta.request_id}`,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class PaddleClient {
  private base: string;

  constructor(private ctx: HookContext) {
    // `sign` rewrites the host from the credential on every call, so this is
    // only a starting point. Reading the Connection first keeps a pre-sign log
    // line honest about which environment the call is for.
    const environment = environmentFromConnection(ctx.connection);
    this.base = environment ? `https://${hostForEnvironment(environment)}` : PLACEHOLDER_BASE;
  }

  /** JSON in, `data` out. Unwraps Paddle's `{data, meta}` envelope. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const envelope = await this.envelope<T>(path, options);
    return envelope.data;
  }

  /**
   * The same request with `meta` kept.
   *
   * List actions return this rather than a bare array: `meta.pagination.next`
   * and `has_more` are the only supported way to walk a large result set, and
   * dropping them would make a workflow that needs page two impossible to
   * write.
   */
  async envelope<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<PaddleEnvelope<T>> {
    const res = await this.send(path, options);
    if (res.status === 204) return { data: undefined as T };
    const text = await res.text();
    if (!text) return { data: undefined as T };
    return JSON.parse(text) as PaddleEnvelope<T>;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Paddle takes multi-valued query parameters as ONE comma-separated
      // value (`?status=active,archived`, `?include=prices,customer`), not as
      // a repeated key. Verified across the list endpoints' `id`, `status`,
      // `include`, `customer_id` and `email` parameters, all documented as
      // "Use a comma-separated list".
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
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
      throw new Error(formatPaddleError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
