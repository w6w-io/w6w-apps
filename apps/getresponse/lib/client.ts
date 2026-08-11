import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * GetResponse API v3 client.
 *
 * Every path, parameter and field here was verified on 2026-08-11 against
 * GetResponse's own OpenAPI document — `apireference.getresponse.com/open-api.json`,
 * OpenAPI 3.0.0, "GetResponse APIv3", version stamp `3.2026-07-28`, 2.4 MB,
 * 141 paths — plus its narrative documentation at `apidocs.getresponse.com/v3`
 * and live probes against `api.getresponse.com`. Nothing here came from a
 * third-party integration directory.
 *
 * ## Three hosts, not one
 *
 * The vendor's spec declares three servers, and an account belongs to exactly
 * one of them:
 *
 *   | Platform            | Host                          |
 *   | ------------------- | ----------------------------- |
 *   | GetResponse (retail)| `api.getresponse.com`         |
 *   | GetResponse MAX US  | `api3.getresponse360.com`     |
 *   | GetResponse MAX PL  | `api3.getresponse360.pl`      |
 *
 * MAX is the enterprise product and its customers cannot reach the retail host
 * at all, so the platform is an **Auth field** — it and the key are two halves
 * of one Connection — and all three hosts are in `network.allow`. Note that is
 * three exact hostnames rather than a wildcard: unlike the self-hosted apps in
 * this pack the set is closed and known at publish time, so the manifest says so.
 *
 * ## Authentication is a prefixed header value
 *
 * From the spec's own security scheme: header `X-Auth-Token`, and "Header value
 * must be prefixed with api-key". So the wire format is
 * `X-Auth-Token: api-key <key>` — the prefix is literal, and omitting it is the
 * mistake that produces `Unsupported authentication method`.
 *
 * ## Filters and sorts are bracketed query parameters
 *
 * `?query[email]=ada@example.com`, `?query[createdOn][from]=2026-01-01`,
 * `?sort[createdOn]=DESC`. The brackets are part of the parameter name, not a
 * nesting convention this client invents — {@link buildQuery} flattens a
 * structured object into them so an action can take ordinary fields.
 *
 * ## Errors are richly structured, and worth keeping
 *
 * Verified live: an unauthenticated call returns
 * `{"httpStatus":401,"code":1014,"codeDescription":"Problem during
 * authentication process, check headers!","message":"Unsupported authentication
 * method","moreInfo":"…"}`. The numeric `code` is the stable half —
 * `1014` authentication, `1015` throttling — and `context` names offending
 * fields on a validation failure.
 */

export type GetResponsePlatform = "retail" | "max-us" | "max-pl";

export const PLATFORM_HOSTS: Record<GetResponsePlatform, string> = {
  "retail": "api.getresponse.com",
  "max-us": "api3.getresponse360.com",
  "max-pl": "api3.getresponse360.pl",
};

/** The literal prefix the vendor's security scheme requires before the key. */
export const AUTH_PREFIX = "api-key ";

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface GetResponseConnectionDisplay {
  platform?: GetResponsePlatform;
}

export function baseUrlFor(platform: GetResponsePlatform | undefined): string {
  return `https://${PLATFORM_HOSTS[platform ?? "retail"]}/v3`;
}

/** Read the platform off the redacted Connection. Never touches the credential. */
export function platformFromConnection(
  connection: RedactedConnection | undefined,
): GetResponsePlatform {
  const display = (connection?.display ?? {}) as GetResponseConnectionDisplay;
  const platform = display.platform;
  return platform && platform in PLATFORM_HOSTS ? platform : "retail";
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface GetResponseErrorBody {
  httpStatus?: number;
  code?: number;
  codeDescription?: string;
  message?: string;
  moreInfo?: string;
  context?: unknown;
  uuid?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * GetResponse's update is a `POST` that applies exactly the keys present, so
 * forwarding a field the user never touched would overwrite a real value.
 * `false` and `0` survive.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a comma-separated or array param into a list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Flatten a structured filter/sort object into GetResponse's bracketed
 * parameter names.
 *
 *     buildQuery({ query: { email: "a@b.c", createdOn: { from: "2026-01-01" } } })
 *       → { "query[email]": "a@b.c", "query[createdOn][from]": "2026-01-01" }
 *
 * One level of nesting is all the API uses, but the walk is general so a future
 * parameter cannot silently be dropped. Unset values are skipped rather than
 * sent empty — GetResponse treats `query[email]=` as a filter matching nothing,
 * which is indistinguishable from a genuine empty result.
 */
export function buildQuery(
  parts: Record<string, unknown>,
  prefix = "",
): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [key, value] of Object.entries(parts)) {
    if (value === undefined || value === null || value === "") continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, buildQuery(value as Record<string, unknown>, name));
    } else {
      out[name] = Array.isArray(value) ? value.join(",") : value as QueryValue;
    }
  }
  return out;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render GetResponse's error body as one actionable line.
 *
 * The numeric `code` is the stable, documented half and is what distinguishes an
 * authentication problem (1014) from throttling (1015) from a validation
 * failure. `context` carries the offending fields, and `uuid` is the id support
 * asks for.
 */
export function formatGetResponseError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: GetResponseErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as GetResponseErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.message && !parsed.codeDescription)) {
    return `GetResponse ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const context = parsed.context ? ` context ${JSON.stringify(parsed.context)}` : "";
  const parts = [
    `GetResponse ${status}${parsed.code !== undefined ? ` code ${parsed.code}` : ""} for ` +
    `${method} ${path}`,
    parsed.message ?? parsed.codeDescription,
    parsed.codeDescription && parsed.message !== parsed.codeDescription
      ? parsed.codeDescription
      : "",
    context,
    parsed.uuid && `uuid ${parsed.uuid}`,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class GetResponseClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFor(platformFromConnection(ctx.connection));
  }

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
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
        formatGetResponseError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
