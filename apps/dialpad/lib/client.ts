import type { HookContext } from "@w6w/types";

/**
 * Dialpad Admin API v2 REST client (`dialpad.com/api/v2`).
 *
 * Everything in this module was verified on 2026-08-29 against Dialpad's own
 * machine-readable OpenAPI 3.1 document — fetched live from
 * `dash.readme.com/api/v1/api-registry/cwu1asmtbsrjuf`, the registry id embedded
 * in `developers.dialpad.com/reference`'s own server-rendered props
 * (`oasPublicUrl: "@dialpad/v1.0#cwu1asmtbsrjuf"`) — plus live probes against
 * `dialpad.com` and `status.dialpad.com`. Nothing here came from a third-party
 * integration directory.
 *
 * ## One host, shared with the marketing site
 *
 * The OpenAPI document declares two servers: `https://dialpad.com/` (production)
 * and `https://sandbox.dialpad.com/` (a separate test company, live-probed
 * 2026-08-29 and confirmed to answer the same `401` shape as production). This
 * app only ever builds requests against the production host — `dialpad.com`
 * itself, not a dedicated `api.` subdomain, which is why `w6w.network.allow`
 * names the bare apex. Every documented path carries the `/api/v2` prefix.
 *
 * ## No envelope, but a shared cursor page shape
 *
 * Unlike some vendors, a single-resource read or write returns the resource
 * object directly — there is no `{"data": …}` wrapper to unwrap. Every list
 * endpoint instead answers `{cursor, items}`: `cursor` is `null` on the last
 * page, and there is no `total` to compute a page count from.
 *
 * ## Errors are Google-API-shaped, and 401 does not distinguish missing from bad
 *
 * Every failure observed live is `{"error": {"code", "message", "errors": [{
 * "domain", "message", "reason"}]}}`. Measured 2026-08-29: an entirely absent
 * `Authorization` header and a syntactically-plausible-but-wrong bearer token
 * produce the byte-identical body — `{"error": {"code": 401, "message":
 * "A valid API key must be provided.", "errors": [{"domain": "global",
 * "reason": "required", ...}]}}`. There is no separate "invalid token" code to
 * distinguish the two cases, unlike (for example) Apify's
 * `token-not-provided` vs `user-or-token-not-found`.
 *
 * ## Two live secrets hide in ordinary reads
 *
 * A **webhook**'s and an **API call router**'s `signature` field carries a
 * `secret` — the literal string Dialpad signs outbound payloads with — and it
 * comes back in full on every create, get, list and update response. Measured
 * live in the vendor's own OpenAPI example for `POST /api/v2/webhooks`:
 * `"signature": {"algo": "HS256", "secret": "test_secret", "type": "jwt"}`.
 * This is the same class of finding as Apify's `proxy.password` and
 * `urlSigningSecretKey` — an ordinary read handing back a working credential —
 * so {@link stripSignatureSecret} removes it before any Action returns one of
 * these entities. The `algo` and `type` fields are harmless metadata and
 * survive; only `secret` is dropped.
 */

/** The one production origin. Never `sandbox.dialpad.com` — see the module doc. */
export const API_BASE = "https://dialpad.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** The `{cursor, items}` shape every list endpoint answers. */
export interface DialpadPage<T> {
  cursor?: string | null;
  items?: T[] | null;
}

interface DialpadErrorBody {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ domain?: string; message?: string; reason?: string }>;
  };
}

/** Drop keys the caller left unset, so an optional query param is truly absent rather than `"undefined"`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied resource id (a Dialpad id, an e164 number, or `"me"`). */
export function encodeId(id: string | number): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * The `signature.secret` field carried by a webhook or API call router entity —
 * a live HMAC/JWT-signing secret handed back on every read. See the module doc.
 */
export interface SignedEntity {
  signature?: { algo?: string; secret?: string; type?: string } | null;
  [key: string]: unknown;
}

/**
 * Remove `signature.secret` from a webhook or API call router entity, returning
 * a shallow copy. `algo` and `type` are harmless and kept; only the secret
 * string is dropped. Safe to call on an entity with no `signature` at all.
 */
export function stripSignatureSecret<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out = { ...(entity as Record<string, unknown>) };
  const sig = out.signature;
  if (sig && typeof sig === "object" && !Array.isArray(sig)) {
    const { secret: _secret, ...rest } = sig as Record<string, unknown>;
    out.signature = rest;
  }
  return out as T;
}

/** Same, mapped over every item of a {@link DialpadPage}. */
export function stripSignatureSecretFromPage<T>(page: DialpadPage<T>): DialpadPage<T> {
  return { ...page, items: page.items?.map((item) => stripSignatureSecret(item)) };
}

/**
 * Turn Dialpad's error body into one actionable line.
 *
 * `reason` is kept when present because it is the one field that sometimes
 * distinguishes cases the flattened `message` collapses together (e.g.
 * `"required"` vs a validation `reason` on a 400). `code` is Dialpad's own
 * echoed status, not necessarily identical to the HTTP status if a proxy
 * intervened, so both are shown when they differ.
 */
export function formatDialpadError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: DialpadErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as DialpadErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const err = parsed?.error;
  if (!err) return `Dialpad ${status} for ${method} ${path}: ${truncate(raw)}`;

  const reason = err.errors?.[0]?.reason;
  const parts = [
    `Dialpad ${status}${err.code && err.code !== status ? ` (code ${err.code})` : ""} for ` +
    `${method} ${path}`,
    err.message,
    reason ? `reason: ${reason}` : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class DialpadClient {
  constructor(private ctx: HookContext) {}

  /** Parse and return the JSON body. Used by every read/write that returns one resource or a page. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — used by the one delete (`callrouters.delete`) whose 200 carries no body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(compact(options.query ?? {}))) {
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
      throw new Error(formatDialpadError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
