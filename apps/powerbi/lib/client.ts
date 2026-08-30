/**
 * Power BI REST API client — the whole vendor surface this App talks to.
 *
 * Everything here was checked against the live Power BI REST API reference
 * (https://learn.microsoft.com/en-us/rest/api/power-bi/, TOC fetched
 * 2026-08-30) and against live, unauthenticated probes of `api.powerbi.com`
 * on the same date. Three things this file exists to absorb:
 *
 *  1. **This is NOT Microsoft Graph.** Unlike this pack's other Microsoft apps
 *     (`sharepoint`, `teams`, `onedrive`, …), Power BI's REST API lives at its
 *     own host, `api.powerbi.com/v1.0/myorg`, with its own OAuth resource —
 *     see `../auth/oauth2.ts` for what that means for token scopes.
 *
 *  2. **"My workspace" is a path segment you omit, not a separate API.** Power
 *     BI's own docs publish two URLs per operation — e.g. `GET /reports` and
 *     `GET /groups/{groupId}/reports` — that differ only by whether a
 *     `/groups/{id}` segment is present, and every pair shares the identical
 *     required scope. `groupPath()` makes that a single optional parameter
 *     rather than doubling the action count, the same shape this pack's
 *     `sharepoint` App uses for "tenant root site vs. a named site".
 *
 *  3. **The error contract has no body on an auth failure.** Verified live
 *     2026-08-30: a request with no `Authorization` header, and one with a
 *     syntactically-bogus bearer token, both come back `403` with
 *     `content-length: 0` — there is no JSON envelope to parse. The one
 *     signal Power BI actually sends is the `x-powerbi-error-info` response
 *     HEADER (e.g. `InvalidToken`), which is why `describeFailure()` reads
 *     that header first rather than assuming a Graph-shaped `{error:{code,
 *     message}}` body. A *validation* failure (bad request body, a bad DAX
 *     query) does carry a JSON body — Power BI's own `PowerBIError` shape,
 *     `{"error": {"code": "...", "pbi.error": {...}}}` — so the body is still
 *     read as a fallback.
 *
 * Note there is no `Authorization` header anywhere in this file: the runtime
 * routes every request through the Auth `sign` hook, which is the only code
 * handed the credential.
 */
import type { HookContext } from "@w6w/types";

/** The one stable, non-regional Power BI REST endpoint. */
export const API_URL = "https://api.powerbi.com/v1.0/myorg";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /** Query parameters. OData names (`$filter`, `$top`, `$skip`) are passed through verbatim. */
  query?: Record<string, QueryValue>;
  /** JSON object → JSON-encoded body. `undefined` → no body at all. */
  body?: unknown;
  /** Extra request headers. */
  headers?: Record<string, string>;
}

/** The shape of every Power BI collection response — always a bare `{ value: [...] }`, never paginated by a cursor. */
export interface PowerBIList<T> {
  value: T[];
}

/**
 * Which workspace: omit `groupId` for "My workspace" (the caller's own,
 * license-scoped workspace), or set it to address a shared workspace by its
 * GUID. Every non-admin resource in this App is reachable both ways, and
 * Power BI's own reference documents identical required scopes for each pair
 * — see the file doc comment.
 */
export interface WorkspaceRef {
  groupId?: string;
}

/** `""` for My workspace, or `/groups/{id}` for a named workspace. */
export function groupPath(ref: WorkspaceRef = {}): string {
  const groupId = ref.groupId?.trim();
  return groupId ? `/groups/${encodeURIComponent(groupId)}` : "";
}

/** Power BI's own error envelope for a request that *did* get a JSON body — a validation failure, not an auth failure. */
interface PowerBIError {
  error?: { code?: string; message?: string; "pbi.error"?: { code?: string } };
}

/** Thin wrapper over `ctx.fetch`. */
export class PowerBIClient {
  constructor(private ctx: HookContext) {}

  private url(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  private async fire(path: string, options: RequestOptions): Promise<Response> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const method = options.method ?? "GET";
    const res = await this.ctx.fetch(url.toString(), { method, headers, body });
    if (!res.ok) throw new Error(await describeFailure(res, method, url));
    return res;
  }

  /** Perform a request and decode the JSON body. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.fire(path, options);
    // 202/204 carry no body by contract; anything else that fails to parse is
    // treated the same rather than masking a real response as an error.
    if (res.status === 204) return undefined as T;
    return await res.json().catch(() => undefined) as T;
  }

  /** A request whose only meaningful result is "the service accepted it" — a 200/202 with no body worth decoding. */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.fire(path, options);
    return { status: res.status };
  }

  /**
   * As `status()`, but also surfaces the two headers a `202 Accepted` job
   * response carries (Refresh Dataset's documented headers) — never a body,
   * since the endpoints this is used for return none.
   */
  async accepted(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ status: number; requestId?: string; location?: string }> {
    const res = await this.fire(path, options);
    return {
      status: res.status,
      requestId: res.headers.get("x-ms-request-id") ?? undefined,
      location: res.headers.get("location") ?? undefined,
    };
  }

  /** Fetch a collection — always a single, un-paginated `{ value: [...] }`. */
  async list<T>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const body = await this.request<PowerBIList<T>>(path, options);
    return body?.value ?? [];
  }

  /**
   * Fetch a binary response (the finished export file) and return the raw
   * bytes alongside the `Content-Type` the vendor sent — never decoded as
   * JSON.
   */
  async binary(path: string, options: RequestOptions = {}): Promise<
    { bytes: Uint8Array; contentType: string }
  > {
    const res = await this.fire(path, options);
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, contentType };
  }
}

/**
 * Surface Power BI's error signal, whichever of the two shapes the response
 * actually carries — see the file doc comment for why both exist.
 */
async function describeFailure(res: Response, method: string, url: URL): Promise<string> {
  const headerInfo = res.headers.get("x-powerbi-error-info");
  let bodyDetail = "";
  try {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as PowerBIError;
        const code = parsed.error?.code ?? parsed.error?.["pbi.error"]?.code;
        const message = parsed.error?.message;
        bodyDetail = [code, message].filter(Boolean).join(": ") || text;
      } catch {
        bodyDetail = text;
      }
    }
  } catch { /* body already consumed or unreadable */ }

  const detail = [headerInfo, bodyDetail].filter(Boolean).join(" — ") || res.statusText;
  return `Power BI ${res.status} ${res.statusText} for ${method} ${url.pathname}: ${detail}`;
}

/** base64 encode a byte array (no url-safe transformation). */
export function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Drop `undefined` entries so a request body only ever carries what the caller set. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
