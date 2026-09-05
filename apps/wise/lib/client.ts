import type { HookContext } from "@w6w/types";

/**
 * Wise Platform API REST client.
 *
 * Everything in this module was verified on 2026-09-05 against Wise's own
 * machine-readable OpenAPI 3.1 bundle
 * (`docs.wise.com/_bundle/api-reference/@latest/index.json`, 1,919,425 bytes,
 * `info.title` "Wise Platform API"), the prose guide at
 * `docs.wise.com/guides/developer/auth-and-security/personal-api-token`, and
 * live probes against `api.wise.com`. Nothing came from a third-party
 * integration directory.
 *
 * ## The base URL is calendar-versioned, not integer-versioned
 *
 * The OpenAPI document's `servers[0].url` is `https://api.wise.com/2026Q3`, and
 * the personal-API-token guide's own worked example (`GET /profiles`) uses the
 * same prefix. This replaces the classic per-resource version numbers
 * (`/v1/profiles`, `/v3/profiles/{id}/quotes`, `/v4/profiles/{id}/balances` —
 * all confirmed live, and inconsistent resource-to-resource, which is exactly
 * the "mixture of v1 and v2" the vendor's own `recipient` tag description warns
 * about for "pre-global versioned APIs (legacy)"). The calendar prefix routes
 * every endpoint this app uses; probing `/2027Q1/...` on 2026-09-05 answered
 * **404** (not yet valid) and `/bogus-version-zzz/...` also 404 (not a
 * catch-all), so the segment is genuinely validated server-side, not cosmetic —
 * meaning this constant will need bumping when Wise rolls to the next quarter.
 *
 * ## Two error shapes, not one
 *
 * - **Auth/authorization failures** answer OAuth-style:
 *   `{"error": "invalid_token", "error_description": "Invalid token"}`
 *   (verified live: a missing token answers `missing_token`, a garbage bearer
 *   answers `invalid_token`, both 401).
 * - **Validation failures** (e.g. creating a recipient with a bad sort code)
 *   answer a list: `{"timestamp": ..., "errors": [{"code", "message", "path"}]}`.
 *
 * {@link formatWiseError} reports whichever shape is present, verbatim, rather
 * than collapsing both to "HTTP 400" — `path` is the field that failed, which
 * is the one thing worth keeping from a validation error.
 */

/** Verified live 2026-09-05: routes every endpoint this app calls. See module docs. */
export const API_BASE = "https://api.wise.com";
export const API_VERSION = "2026Q3";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON. Defaults the content type to `application/json`. */
  body?: unknown;
  /**
   * Overrides the outgoing content type. Quote Update is the one endpoint in
   * this app's surface that requires `application/merge-patch+json` instead of
   * `application/json` — sending the wrong one is refused with a 415.
   */
  contentType?: string;
}

interface WiseValidationError {
  code?: string;
  message?: string;
  path?: string;
}

interface WiseValidationErrorBody {
  errors?: WiseValidationError[];
}

interface WiseAuthErrorBody {
  error?: string;
  error_description?: string;
}

/** Drop keys the caller left unset, so an absent filter is never sent as `"undefined"`. */
export function compact(obj: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

/**
 * Drop keys the caller left unset from a JSON request body, WITHOUT
 * stringifying the surviving values — unlike {@link compact}, which targets
 * query strings and must return `string`. A quote's `sourceAmount` has to
 * reach Wise as a JSON number; stringifying it here would send `"100"` where
 * the schema says `100` and get a validation error naming the wrong field.
 */
export function compactBody<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can carry several field errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a Wise error body into one actionable line, whichever of the two
 * documented shapes it is.
 */
export function formatWiseError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: (WiseValidationErrorBody & WiseAuthErrorBody) | null = null;
  try {
    parsed = JSON.parse(raw) as WiseValidationErrorBody & WiseAuthErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (parsed?.errors?.length) {
    const detail = parsed.errors
      .map((e) => `${e.path ? `${e.path}: ` : ""}${e.message ?? e.code ?? "invalid"}`)
      .join("; ");
    return truncate(`Wise ${status} for ${method} ${path}: ${detail}`);
  }
  if (parsed?.error) {
    return truncate(
      `Wise ${status} ${parsed.error} for ${method} ${path}` +
        (parsed.error_description ? `: ${parsed.error_description}` : ""),
    );
  }
  return truncate(`Wise ${status} for ${method} ${path}: ${raw}`);
}

/**
 * Derive a stable RFC-4122-shaped UUID from an arbitrary seed string.
 *
 * Wise's transfer-idempotency field, `customerTransactionId`, is documented
 * `"format": "uuid"` and enforced as such — unlike Apify's webhook
 * `idempotencyKey`, which accepts "a UUID or another random string with enough
 * entropy". `ctx.invocation.invocationId` is host-issued but NOT a UUID (it is
 * shaped `inv_01HXY...` per `rfcs/invocation.md`), so it cannot be sent
 * verbatim. Hashing it into a UUID keeps the idempotency property (the same
 * invocation always derives the same key, so a retried step reuses it) while
 * satisfying Wise's format requirement. This is this app's own key-derivation
 * choice, not a claim about Wise's behavior.
 */
export async function deriveUuid(seed: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${
    hex.slice(20, 32)
  }`;
}

/**
 * Accept a `json`-typed param as either a parsed value or the string a user
 * typed into a text field — the host hands a `json` param through in whichever
 * shape it arrived.
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

export class WiseClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}/${API_VERSION}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = options.contentType ?? "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatWiseError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
