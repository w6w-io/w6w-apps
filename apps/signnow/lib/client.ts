/**
 * SignNow REST API.
 *
 * Every path, parameter and response field used by this app was read off
 * SignNow's own machine-readable contract —
 * `github.com/signnow/OpenAPI-Specification` (`signNow-oas2.json`, Swagger
 * 2.0, fetched 2026-08-25) — and cross-checked live against `api.signnow.com`
 * on the same date. Nothing here is inferred from a naming pattern.
 *
 * ## Two hosts, and the spec's own host is the wrong one
 *
 * The spec's `host` field reads `api-eval.signnow.com` — SignNow's **free
 * trial / evaluation** environment, issued to developer accounts created at
 * signnow.com/developers before a paid subscription. Accounts on a paid plan
 * live on `api.signnow.com` instead; the two are separate user bases with
 * separate credentials, not environments of the same account the way
 * Docusign's demo/production split works. Copying the spec's `host` verbatim
 * points a production integration at an environment it was never provisioned
 * on. This app makes the host a connect-time choice (`apiHost`, defaulting to
 * `api.signnow.com`) rather than hardcoding either.
 *
 * ## Auth
 *
 * `POST {host}/oauth2/token` — HTTP Basic (`client_id:client_secret`, the
 * SignNow API application's credentials) plus form-encoded `grant_type`:
 *
 *   - `password` — `username` + `password` (a SignNow account's own login).
 *     This is the credential this app collects; it is what SignNow documents
 *     for server-to-server integrations that act as one fixed account, with
 *     no browser redirect.
 *   - `refresh_token` — exchanges `refresh_token` for a new access token,
 *     still under the same Basic header.
 *   - `authorization_code` — a third grant the spec documents (`code` param),
 *     for a user-consent browser flow. **Deliberately not implemented**: the
 *     spec's `/oauth2/token` is the only OAuth path it defines — there is no
 *     `/oauth2/authorize` endpoint in the machine-readable contract, and
 *     without a verified authorization URL this app cannot mint the redirect
 *     safely. Password grant is what the spec fully documents end to end.
 *
 * `GET {host}/oauth2/token` **verifies** a token by echoing it back
 * (`{access_token, scope, expires_in, token_type}`) — it exists to check an
 * already-known token, not to probe liveness, and using it as a health/auth
 * check would leak the caller's own bearer token into the check's result.
 * This app never calls it.
 *
 * ## Errors
 *
 * SignNow answers almost every failure — a missing token, an invalid one, bad
 * Basic credentials, a malformed request — with **HTTP 400** and a small JSON
 * envelope, not the 401/403 REST convention:
 *
 * ```
 * GET  /user                                    (no/bad bearer)
 *   -> 400 {"error":"invalid_token","code":1537}
 * POST /oauth2/token                             (no Basic header)
 *   -> 400 {"error":"invalid_client","code":1538}
 * POST /oauth2/token  (bad client id/secret)
 *   -> 400 {"error":"invalid_client"}
 * GET  /                                         (unmapped route)
 *   -> 404 {"404":"Unable to find a route to match the URI: "}
 * ```
 * Verified live 2026-08-25. `error` (or `error_description`) is what this
 * client surfaces; the status code is a hint, not the classifier.
 *
 * ## Webhooks 2.0 has a split auth model — noted, not fully implemented
 *
 * `POST /api/v2/events` (create) takes the same per-user Bearer as everything
 * else, but `GET /api/v2/events` (list) and `DELETE
 * /api/v2/events/{id}` are documented as **Basic** (the application's own
 * `client_id:client_secret`, no user token). `PUT` accepts either. This app's
 * `sign` hook only ever stamps Bearer — it has no way to switch an individual
 * action onto Basic without an Action touching the raw credential, which the
 * platform forbids — so `event-subscription-create` and
 * `event-subscription-update` are implemented and `event-subscription-list` /
 * `event-subscription-delete` are deliberately left out. See `README.md`.
 *
 * ## No auth header here
 *
 * The runtime routes every `ctx.fetch` through the auth `sign` hook, which is
 * the only code handed the credential. This client never sets one.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

/** The two hosts SignNow issues credentials against. Not environments of one account. */
export const API_HOSTS = {
  production: "api.signnow.com",
  eval: "api-eval.signnow.com",
} as const;

export type ApiHost = typeof API_HOSTS[keyof typeof API_HOSTS];

/** `POST`/`GET {host}/oauth2/token` — code exchange, refresh, and verify. */
export const TOKEN_PATH = "/oauth2/token";

/** SignNow's error envelope. */
export interface SignNowError {
  error?: string;
  error_description?: string;
  code?: number;
  message?: string;
}

/** Read the `apiHost` `afterConnect` recorded. Actions call this, never the raw credential. */
export function apiHostFrom(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || API_HOSTS.production;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON request body. Omitted keys are never sent. */
  body?: unknown;
  /** Return the raw `Response` instead of a parsed JSON body (e.g. a PDF download). */
  raw?: boolean;
  headers?: Record<string, string>;
}

/** Drop `undefined` / `null` / `""` so an unset optional param is never sent. */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Parse a JSON-array param (recipients, cc, headers, …). Rejects anything that
 * is not an array so a typo fails here with the param's name rather than as an
 * opaque error from SignNow.
 */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

/** Parse a JSON-object param. Same reasoning as {@link jsonArray}. */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/**
 * Thin wrapper over `ctx.fetch`, composing `https://{apiHost}` from the
 * Connection. Never sets an auth header — `sign` does that.
 */
export class SignNowClient {
  private readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = `https://${apiHostFrom(ctx.connection)}`;
  }

  /** Exposed for tests and log messages. */
  get apiBase(): string {
    return this.base;
  }

  /** Issue a request and return the parsed JSON body (or the raw `Response`). */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let parsed: SignNowError | undefined;
      if (text) {
        try {
          parsed = JSON.parse(text) as SignNowError;
        } catch {
          // Non-JSON error body — fall back to the text.
        }
      }
      const label =
        [parsed?.error, parsed?.error_description ?? parsed?.message].filter(Boolean).join(": ") ||
        (text ? text.slice(0, 200) : res.statusText);
      throw new Error(`SignNow ${res.status} for ${method} ${url.pathname}: ${label}`);
    }

    if (options.raw) return res as unknown as T;

    if (res.status === 204) {
      await res.body?.cancel();
      return undefined as T;
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
