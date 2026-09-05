import type { HookContext } from "@w6w/types";

/**
 * Judge.me API v1 REST client.
 *
 * Verified 2026-09-05 against Judge.me's own machine-readable OpenAPI 3.0
 * document, fetched directly from `https://judge.me/api/docs.yaml`
 * (67,965 bytes, `application/x-yaml`) — the Redoc page at
 * `https://judge.me/api/docs` is only a viewer for that same file and was not
 * used as a source. Nothing here came from a third-party integration
 * directory.
 *
 * ## The host is `api.judge.me`, not `judge.me`
 *
 * The document's `servers` block names exactly one server:
 * `https://api.judge.me/api/v1`. `judge.me` itself only serves the docs page
 * and the OAuth authorize screen (`app.judge.me/oauth/authorize`); no API
 * request in this app ever reaches either.
 *
 * ## Two credential shapes, and this app implements one of them
 *
 * The document's own "Authentication" prose (not a `description` on a single
 * scheme — it is prose in `info.description`) states there are two ways to
 * authenticate:
 *
 *  - **API keys** (private or public) — the `X-Api-Token` header, ALWAYS
 *    combined with a `shop_domain` query parameter (`securitySchemes.PrivateAPIKey`
 *    / `PublicAPIKey` + `ShopDomain`, both required together on every
 *    protected path). This is what `auth/api-key.ts` implements.
 *  - **OAuth2 access tokens** — `Authorization: Bearer <token>` (or an
 *    `api_token` query parameter), with the shop derived from the token so
 *    `shop_domain` is not needed. The document names the authorize URL
 *    (`https://app.judge.me/oauth/authorize`) but publishes **no token
 *    endpoint anywhere** — not in `servers`, not in a `security` scheme
 *    description, not in a path. `OAuth2Config.tokenUrl` is required by this
 *    app's own type contract, and guessing it would mean shipping an
 *    unverified endpoint as if it were documented. OAuth2 is therefore left
 *    out of this app; every action here works with the api-key credential.
 *  - The document is also explicit that mixing the two fails: sending an
 *    OAuth access token in the `X-Api-Token` header (instead of
 *    `Authorization: Bearer`) is rejected with the same
 *    "Failed to authenticate. Shop domain or Api Token is wrong" message a
 *    plain bad credential gets — see `auth/api-key.ts`.
 *
 * ## One error shape, one message for two different problems
 *
 * Every failure this app has observed — live probes on 2026-09-05, and every
 * documented 422/error response in the spec — is `{"error": "<message>"}`,
 * a plain string, never a nested object. That is consistent, but the message
 * itself is not diagnostic: a bad `apiToken`, a wrong `shopDomain`, or both
 * together all produce the exact same string, verbatim,
 * `"Failed to authenticate. Shop domain or Api Token is wrong"` — confirmed
 * live against `api.judge.me`. There is no way, from the response alone, to
 * tell a caller which of the two fields to fix.
 *
 * ## No rate-limit signal of any kind
 *
 * The spec documents no `X-RateLimit-*`/`Retry-After` header on any endpoint,
 * and a live 401 response from `api.judge.me` (measured 2026-09-05) carries
 * none either. `health/quota.ts` declares this a positive absence rather than
 * guessing at a ceiling.
 */

export const API_BASE = "https://api.judge.me";
export const API_PREFIX = "/api/v1";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/**
 * Drop keys the caller left unset, so an optional filter is genuinely optional.
 *
 * Generic over the input shape so the result stays assignable to whatever the
 * caller needs it for — a `query: Record<string, QueryValue>` or a JSON
 * request body — rather than collapsing every field to `unknown`.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn Judge.me's error body into one actionable line.
 *
 * Every documented and observed error is `{"error": "<message>"}` — a plain
 * string, never an object — so this only ever has one shape to unwrap. When
 * the body isn't JSON at all (a 5xx from in front of the app, a gateway page)
 * the raw text is kept instead of failing silently.
 */
export function formatJudgeMeError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let message: string | undefined;
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed?.error === "string") message = parsed.error;
    else if (typeof parsed?.message === "string") message = parsed.message;
  } catch {
    // not JSON — fall through to the raw body
  }
  const base = `Judge.me ${status} for ${method} ${path}`;
  return message ? `${base}: ${message}` : `${base}: ${truncate(raw)}`;
}

export class JudgeMeClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints whose success body carries nothing worth returning. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Judge.me's `setting_keys[]` parameter is a repeated key with an
      // exploded array (`style: form, explode: true`), not a single
      // comma-joined value — so an array value is appended once per item,
      // under the literal key the caller passed (including its `[]`).
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
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
      throw new Error(formatJudgeMeError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
