import type { HookContext } from "@w6w/types";

/**
 * Whop REST API client.
 *
 * Verified on 2026-08-29 against Whop's own docs (`docs.whop.com`, fetched as
 * markdown via `llms.txt`/`llms-full.txt` and the per-endpoint OpenAPI 3.1
 * fragments each reference page embeds) plus live probes against
 * `api.whop.com`. Nothing here came from a third-party integration directory.
 *
 * ## One host, one prefix, a dated version on every request
 *
 * `https://api.whop.com/api/v1` is the only production host (Whop also
 * documents `sandbox-api.whop.com`, not used here — this app has no notion of
 * a sandbox connection). Every request pins `Api-Version-Date` to
 * {@link API_VERSION_DATE}, the newest version confirmed live on 2026-08-29
 * (`x-api-version-date` in every fetched OpenAPI fragment).
 *
 * **Pinning is not cosmetic.** Whop's own versioning doc: "If you don't pass
 * an `Api-Version-Date` or have a stored API-key pin, the stable API model is
 * used" — the *original*, `2025-01-01` behavior. Measured live: `GET
 * /products?first=1` with no header answers `400 Missing required parameter:
 * company_id`, while the same call pinned to `2026-08-25-2` expects
 * `account_id`. Every native resource this app touches (Memberships, Members,
 * Products, Plans, Promo Codes, Webhooks) was migrated from a `company_id`
 * body/query model to `account_id` between 2026-06-08 and 2026-08-03 — so an
 * unpinned request from this app would silently send the *new* field name into
 * the *old* handler and get a `400` that looks like a bug in the app rather
 * than a missing header.
 *
 * ## Two payment surfaces, deliberately not unified
 *
 * The **Payments** actions in this app (`payment-list`, `payment-get`,
 * `payment-refund`) call `/payments`, which — as of 2026-08-29 — has **not**
 * been migrated to the versioned native-resource model the changelog covers
 * for every other resource here. It still takes `company_id`, not
 * `account_id`, on every list/read/refund call, confirmed by both the vendor's
 * own Legacy reference page and by Whop's getting-started guide, whose only
 * `curl` example against this API is `GET /payments?company_id=biz_...`. The
 * versioned "Payments" tag under `/api-reference/beta` only adds three
 * *different* endpoints — `capture`, `retrieve status`, `update return_url` —
 * for the confirmation-token checkout flow, and none of them list, read, or
 * refund an existing payment. Sending `Api-Version-Date` alongside a
 * `/payments` call is harmless (it is honoured for the endpoints that *do*
 * branch on it) but does not change `company_id` into `account_id` here.
 *
 * ## Cursor pagination everywhere
 *
 * Every list endpoint uses the same Relay-style cursor pageing:
 * `first`/`after` forward, `last`/`before` backward, and a `page_info` block
 * (`has_next_page`, `has_previous_page`, `start_cursor`, `end_cursor`) beside
 * the `data` array. There is no offset form and no `total` count.
 *
 * ## Errors
 *
 * Every failure — native and legacy alike — is `{"error": {"type",
 * "message", "code"?, "param"?}}` with a 4xx/5xx status, confirmed live for
 * `401`/`400`/`404`. `type` is the stable machine code (`unauthorized`,
 * `not_found`, `invalid_request_error`, `bad_request`, ...) and is kept
 * verbatim by {@link formatWhopError} because the fix differs by code.
 *
 * ## Idempotency
 *
 * "Every authenticated `POST` on the Whop API accepts an `Idempotency-Key`
 * header. ... Retrying with the same key replays the stored response instead
 * of executing the request again" (24-hour window, replay marked with an
 * `Idempotent-Replayed: true` response header). {@link idempotencyHeaders}
 * sends `ctx.invocation.invocationId` as that key on every `perform` action
 * below, which is exactly the "same key = same operation" identity the vendor
 * asks for and is stable across a runtime's retry of one step.
 */

/** The one production host. Whop also documents `sandbox-api.whop.com`, not used here. */
export const API_BASE = "https://api.whop.com/api/v1";

/**
 * Newest dated API version confirmed live on 2026-08-29 (`x-api-version-date`
 * in every fetched OpenAPI fragment, and echoed in the "Unknown Api-Version-Date"
 * 400 body's supported-versions list). Pinning here — rather than leaving it
 * unset — is what keeps this app on the `account_id` field names the rest of
 * the client assumes; see the module doc.
 */
export const API_VERSION_DATE = "2026-08-25-2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Sent as `Idempotency-Key`. Only meaningful on `POST`. */
  idempotencyKey?: string;
  /**
   * How an array-valued query entry is serialized. Defaults to `"bracket"`
   * (`key[]=a&key[]=b`), which every native (`Api-Version-Date`-aware)
   * resource's own docs specify by example (`memberships`' "Repeat as
   * product_ids[] for several"). The **Legacy** Payments resource's OpenAPI
   * fragment instead declares its array filters `style: form, explode: true`
   * — the plain OpenAPI 3 default, `key=a&key=b` with no brackets — so
   * `payment-list.ts` passes `"repeat"` explicitly rather than inheriting the
   * native convention.
   */
  arrayStyle?: "bracket" | "repeat";
}

/** The Relay-style cursor envelope every list endpoint answers with. */
export interface WhopPage<T> {
  data: T[];
  page_info: {
    start_cursor: string | null;
    end_cursor: string | null;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

interface WhopErrorBody {
  error?: { type?: string; message?: string; code?: string; param?: string };
}

/** Drop keys the caller left unset. `false` and `0` survive; only `undefined`/`null`/`""` are dropped. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/comma-string param into a query-ready array. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 * The host hands a `json` param through in whichever shape it arrived.
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

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Whop's `{error: {...}}` body into one actionable line.
 *
 * `type` is kept verbatim because it is a stable machine code across the whole
 * API — `unauthorized` (bad/missing credential), `not_found`, `bad_request`
 * (an unknown `Api-Version-Date`), `invalid_request_error` (a legacy-endpoint
 * validation failure, which also carries `param`) — and collapsing them to a
 * bare HTTP status hides which one actually happened.
 */
export function formatWhopError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: WhopErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as WhopErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Whop ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Whop ${status} ${err.type ?? "error"} for ${method} ${path}`,
    err.code ? `code=${err.code}` : undefined,
    err.param ? `param=${err.param}` : undefined,
    err.message,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * `Idempotency-Key: <invocationId>` when the runtime handed one in — never
 * fabricated, because a key this app invented itself would not be stable
 * across the runtime's own retry of the same step (the whole point of the
 * header) and would just add noise to a request that has no natural retry
 * identity in "editor"/"test" triggers.
 */
export function idempotencyHeaders(ctx: HookContext): Record<string, string> {
  const invocationId = ctx.invocation?.invocationId;
  return invocationId ? { "Idempotency-Key": invocationId } : {};
}

/**
 * Resolve an `accountId` action param against the connection's own account
 * (`display.accountId`, set by `auth/api-key.ts`'s `afterConnect`), so a
 * caller need not repeat it on every action. Returns `undefined` when
 * neither is set; callers that treat it as required throw their own message.
 */
export function resolveAccountId(
  explicit: string | undefined,
  ctx: HookContext,
): string | undefined {
  const value = (explicit ?? "").trim();
  if (value) return value;
  const display = ctx.connection?.display as { accountId?: string } | undefined;
  const fromConnection = (display?.accountId ?? "").trim();
  return fromConnection || undefined;
}

/** Same as {@link resolveAccountId}, but throws when neither source has a value. */
export function requireAccountId(explicit: string | undefined, ctx: HookContext): string {
  const resolved = resolveAccountId(explicit, ctx);
  if (!resolved) {
    throw new Error(
      "accountId is required — pass it explicitly, or connect with an Account ID set",
    );
  }
  return resolved;
}

/**
 * `client_secret` on a Payment: "the credential the buyer's surface presents
 * to poll this payment and set its return URL ... treat it like a password
 * for that one attempt." It is returned to a reader holding the
 * `payment:charge` permission — a scope this app's own actions never need,
 * since they read/list/refund payments for reporting and reconciliation, not
 * to drive a buyer-facing checkout poll. A workflow step's result is
 * persisted and often echoed downstream, so this field is dropped before
 * `payment-get.ts`/`payment-list.ts`/`payment-refund.ts` return, the same
 * discipline this pack applies to any other incidental credential leaked by
 * an otherwise ordinary read.
 */
export function stripPaymentSecret<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out = { ...(entity as Record<string, unknown>) };
  delete out.client_secret;
  return out as T;
}

export class WhopClient {
  constructor(private ctx: HookContext) {}

  get<T = unknown>(
    path: string,
    query?: Record<string, QueryValue>,
    arrayStyle?: "bracket" | "repeat",
  ): Promise<T> {
    return this.request<T>(path, { query, arrayStyle });
  }

  post<T = unknown>(path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    return this.request<T>(path, { method: "POST", body, idempotencyKey });
  }

  patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    const arrayKey = options.arrayStyle === "repeat" ? (k: string) => k : (k: string) => `${k}[]`;
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(arrayKey(k), String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { "api-version-date": API_VERSION_DATE };
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatWhopError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
