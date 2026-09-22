import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Qualtrics REST API v3 client.
 *
 * Everything in this module follows public Qualtrics documentation plus the
 * live, unauthenticated probes recorded in the app README. Two facts shape the
 * whole design:
 *
 * ## The host is per-account, not global
 *
 * Qualtrics is **datacenter-sharded**: every account is pinned to one regional
 * pod — `iad1`, `fra1`, `syd1`, `yul1`, `ca1`, `gov1`, … — and the API is
 * reachable only at `https://<datacenterId>.qualtrics.com/API/v3/...`. The id
 * is not derivable from the credential (Qualtrics auth here is a static API
 * token, not OAuth), so it is collected at connect time and republished onto
 * the connection's redacted `display` by `afterConnect`. Action code — which
 * never sees a credential — reads it from there. `w6w.network.allow` therefore
 * declares the wildcard `*.qualtrics.com`, exactly the mechanism
 * `runtime.ts#hostAllowed()` implements for per-tenant hosts.
 *
 * ## The envelope is always `{meta, result}`
 *
 * A success is `{"meta": {…}, "result": {…}}`; a failure is
 * `{"meta": {"error": {"errorMessage", "errorCode"}}}`. The error body is where
 * the actionable part is — Qualtrics answers **400** for a missing credential
 * and **401** for an invalid one, so nothing in this app may classify a failure
 * from the status code alone. {@link formatQualtricsError} surfaces the
 * vendor's own `errorCode` verbatim, because `ATP_2` and `DCD_7` are different
 * problems with different fixes.
 *
 * ## Pagination follows a URL, not an offset
 *
 * A list response carries `result.nextPage`: a full URL to fetch for the next
 * page, or absent/`null` when there are no more. {@link QualtricsClient.list}
 * follows it verbatim, capped by `maxPages`, rather than assuming a
 * limit/offset query-parameter scheme Qualtrics does not document.
 */

/** Every Qualtrics API host is a datacenter subdomain of this apex. */
export const HOST_SUFFIX = ".qualtrics.com";

/** Every resource path in the v3 API carries this prefix. */
export const API_PREFIX = "/API/v3";

/** How many `nextPage` hops a list action follows before stopping. */
export const DEFAULT_MAX_PAGES = 10;

/**
 * The datacenter id this connection is pinned to.
 *
 * Read from the connection's REDACTED display data — never from the credential,
 * which action code cannot see. `afterConnect` writes it, so a connection that
 * predates that hook reports a fixable error rather than silently calling the
 * wrong host.
 */
export function datacenterFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { datacenterId?: string };
  const datacenterId = (display.datacenterId ?? "").trim();
  if (datacenterId) return datacenterId;
  throw new Error(
    "Qualtrics connection records no datacenter id — reconnect the account so it can be recorded.",
  );
}

/** The origin plus prefix for one account, e.g. `https://iad1.qualtrics.com/API/v3`. */
export function baseUrl(datacenterId: string): string {
  return `https://${String(datacenterId ?? "").trim()}${HOST_SUFFIX}${API_PREFIX}`;
}

/**
 * Qualtrics' own error identifiers, read off the live wire rather than inferred.
 *
 * The two seen while verifying this app, both against `GET /API/v3/whoami`:
 *
 *   | Situation       | Status | `errorCode` | `errorMessage`                                  |
 *   | --------------- | ------ | ----------- | ----------------------------------------------- |
 *   | No header at all| 400    | `ATP_2`     | "Expected authorization in headers, but none…"  |
 *   | Bad token value | 401    | `DCD_7`     | "Unrecognized X-API-TOKEN."                     |
 */
export const ERROR_MISSING_HEADER = "ATP_2";
export const ERROR_UNRECOGNIZED_TOKEN = "DCD_7";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
  /** Extra headers, merged over the defaults. */
  headers?: Record<string, string>;
}

export interface QualtricsEnvelope<T = unknown> {
  meta?: {
    httpStatus?: string;
    requestId?: string;
    error?: { errorMessage?: string; errorCode?: string };
  };
  result?: T;
}

/** One page of a list response: either a bare array or an `elements` object. */
type Page<T> = T[] | { elements?: T[]; nextPage?: unknown };

export interface ListResult<T> {
  /** The `result.elements` of every page fetched, concatenated. */
  elements: T[];
  /** `result.nextPage` from the last page fetched, when more results exist. */
  nextPage?: string;
  /** How many pages were fetched. */
  pages: number;
}

export interface RawResult {
  status: number;
  contentType: string;
  bytes: Uint8Array;
}

/** Keep a long validation body readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Path-escape a caller-supplied resource id without touching legal characters. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Turn a Qualtrics failure body into one actionable line.
 *
 * The vendor's `errorCode` and `errorMessage` are surfaced verbatim, in that
 * order, because the fix differs per code and a flattened "HTTP 401" hides
 * which one you hit.
 */
export function formatQualtricsError(
  status: number,
  method: string,
  path: string,
  detail: string,
): string {
  let body: QualtricsEnvelope | null = null;
  try {
    body = JSON.parse(detail) as QualtricsEnvelope;
  } catch {
    body = null;
  }
  const error = body?.meta?.error;
  const parts = [
    `Qualtrics ${status}${error?.errorCode ? ` ${error.errorCode}` : ""} for ${method} ${path}`,
    error?.errorMessage,
    !error && detail ? truncate(detail) : undefined,
  ].filter(Boolean);
  return parts.join(": ");
}

/** `{meta, result}` in, `result` out — identity when there is no envelope. */
export function unwrap<T>(body: unknown): T {
  if (body && typeof body === "object" && "result" in (body as Record<string, unknown>)) {
    return (body as { result: T }).result;
  }
  return body as T;
}

export class QualtricsClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(datacenterFromConnection(ctx.connection));
  }

  /** One request against a resource path; the envelope's `result` is unwrapped. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return unwrap<T>(await this.json<T>(path, options));
  }

  /** One request against an absolute URL — a `nextPage` link served by Qualtrics. */
  async requestAbsolute<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
    return unwrap<T>(await this.fetchJson<T>(url, options));
  }

  /**
   * Follow `result.nextPage` up to `maxPages` pages and concatenate the pages.
   *
   * The loop stops at the first page that states no `nextPage`, so a response
   * with one page costs exactly one request.
   */
  async list<T = unknown>(
    path: string,
    options: RequestOptions & { maxPages?: number } = {},
  ): Promise<ListResult<T>> {
    const maxPages = Math.max(1, Math.trunc(options.maxPages ?? DEFAULT_MAX_PAGES));
    const elements: T[] = [];
    let nextPage: string | undefined;
    let url: string | undefined = this.buildUrl(path, options.query);
    let pages = 0;

    while (url && pages < maxPages) {
      const page: Page<T> = await this.requestAbsolute<Page<T>>(url, {
        accept: options.accept,
      });
      pages += 1;

      if (Array.isArray(page)) {
        elements.push(...page);
      } else if (page && Array.isArray(page.elements)) {
        elements.push(...page.elements);
      }

      const candidate: unknown = (page as { nextPage?: unknown } | null)?.nextPage;
      nextPage = typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
      url = nextPage;
    }

    return { elements, nextPage, pages };
  }

  /** Raw bytes, for endpoints that answer a file rather than JSON. */
  async raw(path: string, options: RequestOptions = {}): Promise<RawResult> {
    const res = await this.send(this.buildUrl(path, options.query), options);
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      bytes: new Uint8Array(await res.arrayBuffer()),
    };
  }

  private json<T>(path: string, options: RequestOptions): Promise<T> {
    return this.fetchJson<T>(this.buildUrl(path, options.query), options);
  }

  private async fetchJson<T>(url: string, options: RequestOptions): Promise<T> {
    const res = await this.send(url, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Qualtrics returned a non-JSON body for ${new URL(url).pathname}`,
      );
    }
  }

  private async send(url: string, options: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = {
      accept: options.accept ?? "application/json",
      ...(options.headers ?? {}),
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url, init);
    if (!res.ok) {
      // The envelope is read, never the status alone: Qualtrics uses 400 for a
      // missing credential and 401 for an invalid one, so the code is the only
      // thing that distinguishes them.
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatQualtricsError(
          res.status,
          init.method ?? "GET",
          new URL(url).pathname,
          detail,
        ),
      );
    }
    return res;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url.toString();
  }
}
