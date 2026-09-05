import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Jira Data Center / Server's classic REST API — verified against the
 * vendor's own OpenAPI reference (`developer.atlassian.com/server/jira/platform/rest-apis/`,
 * which redirects to the current version's page — fetched 2026-09-05, "Jira
 * Software Data Center REST API Reference").
 *
 * ## There is no vendor host
 *
 * Jira Data Center and Jira Server are self-hosted: every customer runs it on
 * their own domain (`jira.acme.internal`, an IP, a port off `localhost`).
 * There is no `*.atlassian.net`-shaped pattern to allowlist — that pattern
 * belongs to Jira **Cloud**, a different product covered by the sibling
 * `jira` app in this pack. So the instance URL is a connection field, the
 * same posture this pack already uses for `gitea`, `mautic` and `tableau`
 * (Tableau Server half), and `w6w.network.allow` is `["*"]`.
 *
 * ## `/rest/api/2`, not `/rest/api/3`
 *
 * The reference's own "URI Structure" section states the `api` name is
 * "for everything else. Current version is `2`" — Data Center has never
 * shipped a v3. Jira Cloud's v3 (used by the sibling `jira` app) is a
 * Cloud-only API; pointing this app at it would 404 against every
 * self-hosted instance.
 *
 * ## Plain strings, not Atlassian Document Format
 *
 * Cloud's v3 requires `description` and comment bodies to be ADF objects.
 * Data Center's v2 schemas (`CommentJsonBean.body`, the `fields.description`
 * accepted by `IssueUpdateBean`) are plain **wiki-markup strings** — sending
 * an ADF object here would be rejected, and there is nothing this app needs
 * to convert. This is the biggest behavioural difference from the Cloud app
 * in this pack.
 *
 * ## Users are identified by username or key, not `accountId`
 *
 * Jira Cloud replaced username/email lookups with an opaque `accountId` for
 * privacy reasons. Data Center never made that change: `UserJsonBean` and
 * `UserBean` both carry a `name` (the login username) and a `key` (a stable
 * internal id), and `assignee`/`reporter` fields, `/issue/{key}/assignee`, and
 * `/user/search` all key off `username`, not an account id.
 */
export const API_PATH = "/rest/api/2";

/** Public (redacted-safe) connection metadata, set by each auth method's `afterConnect`. */
export interface JiraDcConnectionDisplay {
  /** The instance origin, e.g. `https://jira.acme.internal`. */
  baseUrl?: string;
  user?: { name?: string; key?: string; displayName?: string; emailAddress?: string };
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * People paste `jira.acme.internal:8080`, `https://jira.acme.com/`, and
 * `http://10.0.0.5:8080/jira` alike. A missing scheme defaults to `https` —
 * silently downgrading a credential in flight to plaintext HTTP is not this
 * function's call to make; an operator whose instance really is HTTP-only can
 * type the scheme explicitly.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Jira instance URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Jira instance URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Jira instance URL has no host: ${trimmed}`);
  // Preserve a context path (e.g. `/jira`) if the customer's instance is mounted
  // under one — trim only a trailing slash, never the path itself.
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as JiraDcConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Jira Data Center connection records no instance URL — reconnect it so the URL can be stored",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Jira's error envelope: `{"errorMessages": [...], "errors": {"field": "..."}}`. */
interface JiraDcErrorBody {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

/** Format a Jira error response into one readable line. Never echoes a credential. */
export function jiraDcErrorMessage(status: number, statusText: string, bodyText: string): string {
  let parsed: JiraDcErrorBody | null = null;
  try {
    parsed = bodyText ? (JSON.parse(bodyText) as JiraDcErrorBody) : null;
  } catch {
    parsed = null;
  }
  const parts = [
    ...(parsed?.errorMessages ?? []),
    ...Object.entries(parsed?.errors ?? {}).map(([field, msg]) => `${field}: ${msg}`),
  ];
  if (parts.length > 0) return parts.join("; ");
  return `Jira returned ${status} ${statusText}`.trim();
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class JiraDcClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = `${baseUrlFromConnection(ctx.connection)}${API_PATH}`;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
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
        `Jira ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ` +
          jiraDcErrorMessage(res.status, res.statusText, detail),
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
