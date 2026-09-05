import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Marketo REST API — verified against the current Adobe Experience League
 * source (`github.com/AdobeDocs/marketo-developer.en`, `help/rest-api/*.md`,
 * fetched 2026-09-05): `rest-api.md`, `base-url.md`, `authentication.md`,
 * `error-codes.md`, `leads.md`, `list-membership.md`, `companies.md`,
 * `smart-campaigns.md`, `usage.md`. The old `developers.marketo.com`
 * documentation host now 301s here.
 *
 * **There is no fixed vendor host.** Every Marketo subscription runs on its
 * own "pod" — a base URL keyed by the account's Munchkin ID, e.g.
 * `https://123-ABC-456.mktorest.com` — found per-instance under
 * Admin > Integration > Web Services. So the base URL (and the separate
 * Identity URL used for OAuth) are connection fields, not a manifest
 * constant, and the egress allowlist is `["*"]` — the posture this pack
 * already uses for `mautic`, `tableau`, `kintone`, `learnworlds` and
 * `invoiceninja`.
 *
 * **Marketo's own docs disagree with themselves about whether the value an
 * operator copies already includes `/rest`.** `base-url.md` defines "Base
 * URL" as `https://284-RPR-133.mktorest.com/rest` (the `/rest` segment
 * included) with "Path" starting at `/v1/...`. `rest-api.md`'s own worked
 * example instead calls the same copied value the "Endpoint" and then builds
 * a call as `<Your Endpoint URL>/rest/v1/leads.json` — which only makes sense
 * if that value does NOT include `/rest`. Rather than guess which of
 * Marketo's own pages is right for a given operator's copy-paste, this app
 * strips a trailing `/rest` if present and always appends it itself, so
 * either paste works.
 *
 * **Every REST call — Lead Database (`/rest/v1/...`) and Asset
 * (`/rest/asset/v1/...`) alike — answers HTTP 200 even on failure.**
 * `error-codes.md` is explicit: "When a call contains an error, the API
 * typically still returns HTTP status code 200. The JSON response contains a
 * `success` member with a value of `false` and an array of errors." A 601
 * (invalid token) or 602 (expired token) — Marketo's own auth-failure codes —
 * arrive this way, not as an HTTP 401. Checking `res.ok` here would treat
 * every authentication failure as a success. Only the separate Identity
 * (OAuth token) endpoint uses a real HTTP 401 for a bad client id/secret.
 */

/** Lead Database API — leads, lists, companies, campaign trigger/schedule, usage stats. */
export const API_PATH = "/rest/v1";
/** Asset API — Smart Campaign metadata (query/create/clone/delete/activate). */
export const ASSET_API_PATH = "/rest/asset/v1";

/** Public (redacted-safe) connection metadata. */
export interface MarketoConnectionDisplay {
  /** The instance's REST base URL, e.g. `https://123-abc-456.mktorest.com`. */
  restBaseUrl?: string;
  /** The instance's Identity (OAuth token) URL. Not derivable from restBaseUrl — see auth file. */
  identityUrl?: string;
  /** The `scope` from the token response — the custom service's owning user. */
  scope?: string;
}

/**
 * Normalise a user-typed REST base URL into a bare origin with no trailing
 * `/rest` — see the file header for why the trailing segment must be
 * stripped rather than trusted.
 */
export function normalizeRestBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Marketo REST base URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Marketo REST base URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Marketo REST base URL has no host: ${trimmed}`);
  let path = url.pathname.replace(/\/+$/, "");
  path = path.replace(/\/rest$/i, "");
  return `${url.protocol}//${url.host}${path}`;
}

/**
 * Normalise a user-typed Identity URL. Only whitespace/scheme/trailing-slash
 * cleanup and a defensive strip of a pasted `/oauth/token` suffix — unlike
 * the REST base URL, Marketo's docs never state a derivation rule between
 * the Identity URL and the REST base URL, so this app does not guess one; the
 * operator copies it from Admin > Integration > Web Services same as the
 * REST endpoint.
 */
export function normalizeIdentityUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Marketo Identity URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Marketo Identity URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Marketo Identity URL has no host: ${trimmed}`);
  let path = url.pathname.replace(/\/+$/, "");
  path = path.replace(/\/oauth(\/token)?$/i, "");
  return `${url.protocol}//${url.host}${path}`;
}

/** Read the REST base URL off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as MarketoConnectionDisplay;
  if (display.restBaseUrl) return normalizeRestBaseUrl(display.restBaseUrl);
  throw new Error(
    "this Marketo connection records no REST base URL — reconnect it so the URL can be stored",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | Array<string | number> | undefined | null>;
  body?: unknown;
  /** Route through the Asset API (`/rest/asset/v1`) instead of the Lead Database API. */
  asset?: boolean;
}

/** One Response-Level error, per `error-codes.md`. */
export interface MarketoError {
  code: string;
  message: string;
}

/** One Record-Level result entry, per `error-codes.md` §"Record-Level". */
export interface MarketoRecordResult {
  id?: number;
  status?: string;
  reasons?: Array<{ code: string; message: string }>;
  [key: string]: unknown;
}

/** The envelope every Marketo REST call answers with, success or failure. */
export interface MarketoResponse<T = unknown> {
  requestId?: string;
  success: boolean;
  result?: T;
  errors?: MarketoError[];
  warnings?: string[];
  nextPageToken?: string;
  moreResult?: boolean;
}

/** Fold a Response-Level `errors` array into one readable string. */
export function errorMessage(errors: MarketoError[] | undefined): string {
  if (!errors || errors.length === 0) return "";
  return errors.map((e) => `${e.code}: ${e.message}`).join("; ");
}

/** Drop keys the caller left unset so a sync does not overwrite untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 *
 * Every response is parsed as JSON and checked for the envelope's own
 * `success` flag — a 200 with `success: false` is Marketo's normal shape for
 * an authentication failure (601/602), a rate limit (606) or a bad parameter
 * (7xx), and `res.ok` alone would miss all of them (see file header).
 */
export class MarketoClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<MarketoResponse<T>> {
    const apiPath = options.asset ? ASSET_API_PATH : API_PATH;
    const url = new URL(`${this.base}${apiPath}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();

    let body: MarketoResponse<T> | undefined;
    try {
      body = text ? (JSON.parse(text) as MarketoResponse<T>) : undefined;
    } catch {
      body = undefined;
    }

    if (!body) {
      // 413/414/502-shaped failures are not guaranteed to carry Marketo's JSON
      // envelope at all (error-codes.md — these are gateway-level errors).
      throw new Error(
        `Marketo ${res.status} ${res.statusText} for ${init.method} ${url.pathname} — ` +
          `non-JSON response: ${text.slice(0, 200)}`,
      );
    }
    if (body.success !== true) {
      throw new Error(
        `Marketo rejected ${init.method} ${url.pathname}` +
          (body.errors?.length ? `: ${errorMessage(body.errors)}` : " (success: false)"),
      );
    }
    return body;
  }
}
