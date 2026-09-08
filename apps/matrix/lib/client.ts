import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Matrix Client-Server API client.
 *
 * Verified 2026-09-06 against the official spec at
 * `https://spec.matrix.org/latest/client-server-api/` (the "latest" render,
 * which folds in every version up to v1.18-era changes — see
 * `actions/set-display-name.ts` for why that matters for one endpoint).
 *
 * ## There is no vendor API host — the homeserver IS the host
 *
 * Matrix is a federated, open protocol: `matrix.org` runs one homeserver among
 * many thousands, and most real deployments are an organisation's own server at
 * its own domain. So, exactly as this pack's `gitea`, `mautic`, `tableau` and
 * `bubble` apps do: the homeserver base URL is a **Connection field**, not a
 * literal, and the manifest's egress allowlist is `["*"]` — the price of an app
 * whose server address only the account holder knows.
 *
 * ## Every endpoint lives under a versioned prefix — except one
 *
 * Nearly every Client-Server endpoint used here is namespaced
 * `/_matrix/client/v3/...` (the current stable major version). The one
 * exception, deliberately not namespaced, is capability discovery:
 * `GET /_matrix/client/versions` (no `v3`) — it exists precisely so a client can
 * ask "which versions do you speak?" before assuming any prefix works. This app
 * uses it only for the `instance` health check, unauthenticated, for exactly
 * that reason.
 *
 * ## Errors are a JSON envelope, not just a status code
 *
 * Every Matrix error response is `{"errcode": "M_...", "error": "..."}` (the
 * spec's "Standard error response"). The status code alone is not reliable
 * enough to branch on — the spec's own guidance is to prefer `errcode` — so
 * this client always tries to parse and surface it. `M_UNKNOWN_TOKEN` /
 * `M_MISSING_TOKEN` are the two credential-liveness codes `auth/*.ts` looks for
 * on a 401, rather than trusting "401 means the token is bad" (a 401 with a
 * different `errcode`, e.g. a soft-logout, means something more specific).
 */

/** Public (redacted-safe) connection metadata published by `afterConnect`. */
export interface MatrixConnectionDisplay {
  /** The homeserver's own origin, e.g. `https://matrix.org`. */
  homeserverUrl?: string;
  /** The account's fully-qualified Matrix ID, e.g. `@alice:matrix.org`. */
  userId?: string;
  /** The device id the access token is bound to. */
  deviceId?: string;
}

/**
 * Normalise a user-typed homeserver URL into a bare origin.
 *
 * People paste `matrix.org`, `https://matrix.org/`, and links that carry a
 * trailing `/_matrix/client/...` path. All mean the same server. A missing
 * scheme defaults to `https`: an access token in flight deserves TLS, and an
 * operator running plaintext on a private network can still type `http://`
 * explicitly.
 */
export function normalizeHomeserverUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Matrix homeserver URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Matrix homeserver URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Matrix homeserver URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the homeserver origin off the redacted Connection. Never touches the credential. */
export function homeserverUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MatrixConnectionDisplay;
  if (display.homeserverUrl) return normalizeHomeserverUrl(display.homeserverUrl);
  throw new Error(
    "this Matrix connection records no homeserver URL — reconnect it so the URL can be stored",
  );
}

/** Read the account's own Matrix ID off the redacted Connection. Never touches the credential. */
export function userIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MatrixConnectionDisplay;
  const userId = display.userId?.trim();
  if (userId) return userId;
  throw new Error(
    "this Matrix connection records no user id — reconnect it so the account can be identified",
  );
}

/** Every action endpoint used by this app lives under this prefix. */
export const CLIENT_PATH = "/_matrix/client/v3";

/** The one endpoint that is NOT namespaced under `v3` — see the module doc. */
export const VERSIONS_PATH = "/_matrix/client/versions";

export interface MatrixErrorBody {
  errcode?: string;
  error?: string;
}

/** Parse Matrix's standard `{errcode, error}` envelope. `null` if the body isn't that shape. */
export function parseMatrixError(text: string): MatrixErrorBody | null {
  if (!text) return null;
  try {
    const body = JSON.parse(text);
    if (body && typeof body === "object" && typeof (body as MatrixErrorBody).errcode === "string") {
      return body as MatrixErrorBody;
    }
  } catch {
    // not JSON — fall through
  }
  return null;
}

/** Render a Matrix error body as `M_ERRCODE: human message`, falling back to raw text. */
export function matrixErrorMessage(text: string): string {
  const body = parseMatrixError(text);
  if (!body) return text.slice(0, 300);
  return body.error ? `${body.errcode}: ${body.error}` : body.errcode ?? text.slice(0, 300);
}

/**
 * URL-encode one path segment. Room ids (`!abc:example.org`), user ids
 * (`@alice:example.org`) and room aliases (`#room:example.org`) all carry
 * characters (`!`, `#`, `@`, `:`) that are legal in a Matrix identifier but
 * must be percent-encoded once they sit inside a URL path segment.
 */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Override the default `/_matrix/client/v3` prefix (used only for `versions`). */
  path?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets `authorization` — the runtime
 * routes every signed request through the Auth `sign` hook.
 */
export class MatrixClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = homeserverUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const prefix = options.path ?? CLIENT_PATH;
    const url = new URL(`${this.base}${prefix}${path}`);
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
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Matrix ${res.status} for ${init.method} ${url.pathname}: ${matrixErrorMessage(text)}`,
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Matrix ${init.method} ${url.pathname} returned non-JSON: ${text.slice(0, 200)}`,
      );
    }
  }
}

/** Drop keys the caller left unset, so an optional field is never sent as `null`/`""`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list of trimmed, non-empty strings. */
export function csv(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.map((v) => String(v).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const items = value.split(",").map((v) => v.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

// The `account/whoami` probe itself (`checkWhoami`/`fetchWhoami`) lives in
// `auth/whoami.ts`, not here: it sets an `Authorization` header, and this
// pack's own audit (`_tools/audit.ts`, `credentials/leak`) requires every file
// that touches one to live under `auth/`, even a probe this deliberately
// unsigned (it builds the header by hand rather than going through `sign`).
