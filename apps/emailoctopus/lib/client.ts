/**
 * EmailOctopus **v2** API.
 *
 * Built entirely from the vendor's own machine-readable spec: a GET of
 * <https://emailoctopus.com/api-documentation/v2> returns an OpenAPI 3.1
 * document (133,099 bytes, `info.title: "EmailOctopus v2 API"`, `info.version:
 * "2.0.0"`), not an HTML docs shell. Every path, query parameter, request body
 * and response field this app touches came out of that document, fetched
 * 2026-08-11. It contains zero `"deprecated": true` entries.
 *
 * ## Three things about the base URL that bite
 *
 * 1. **The version is in the HOST, not the path.** `servers[0].url` is
 *    `https://api.emailoctopus.com` and the paths are bare — `/lists`,
 *    `/campaigns`. There is no `/v2` segment. Writing `.../v2/lists` out of
 *    habit gets a JSON 404, not a redirect.
 * 2. **v1 lives on a different host and is still answering.** The old API is
 *    `https://emailoctopus.com/api/1.6/...` — the *website* host — and takes
 *    the key as an `api_key` QUERY PARAMETER. Measured 2026-08-11: it still
 *    returns `{"error":{"code":"API_KEY_INVALID",...}}` with HTTP **403**,
 *    while its documentation page (`/api-documentation/v1`) is **404**. So the
 *    surface outlives its docs; nothing here uses it.
 * 3. **A v2 key is not automatically an old key.** Keys minted before v2 are
 *    labelled *legacy* in the dashboard and are rejected by v2; new keys work
 *    on both versions.
 *
 * ## Auth
 *
 * `components.securitySchemes.api_key` is `{ type: "http", scheme: "bearer" }`,
 * i.e. a plain bearer token in the `Authorization` header. This client never
 * sets that header — the runtime routes each request through the auth `sign`
 * hook, which is the only code handed the credential.
 *
 * ## Errors
 *
 * Every non-2xx is RFC 7807: `{ title, detail, status, type }`, plus an
 * `errors[]` array of `{ detail, pointer|parameter }` on a 422. The `type` is a
 * documentation URL and is the machine-readable discriminator — `detail` is
 * prose. See `describeError` below, which is what makes "no key" and "bad key"
 * distinguishable when both are HTTP 401.
 */
import type { HookContext } from "@w6w/types";

/** `servers[0].url` from the v2 OpenAPI document. No version path segment. */
export const API_URL = "https://api.emailoctopus.com";

/**
 * The cursor envelope every collection response carries.
 *
 * `paging.next` is **absent on the last page** — that absence, not an empty
 * `data` array, is how you know to stop. `next.url` is a fully-formed absolute
 * URL including the cursor, so a caller can follow it verbatim.
 */
export interface Paging {
  next?: { url?: string; starting_after?: string };
}

/** Every list endpoint returns `{ data, paging }` — the key is always `data`. */
export interface Page<T = unknown> {
  data: T[];
  paging?: Paging;
}

/** Query parameters shared by every paginated v2 endpoint. */
export interface PageInput {
  limit?: number;
  startingAfter?: string;
}

/** Map the shared page inputs onto EmailOctopus's query-parameter names. */
export function pageQuery(input: PageInput): Record<string, string | number | undefined> {
  return { limit: input.limit, starting_after: input.startingAfter };
}

/**
 * The `Param[]` fragment every paginated action reuses.
 *
 * `limit` defaults to 100 server-side and 100 is also the documented maximum
 * page size ("Each response will contain a maximum of 100 results"), so this
 * app sends nothing unless the caller asks for less.
 */
export const PAGE_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    hint: "Results per page. EmailOctopus defaults to 100, which is also the maximum.",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "startingAfter",
    label: "Starting after (cursor)",
    type: "string" as const,
    hint:
      "Pass the previous response's `paging.next.starting_after` verbatim. The cursor is opaque — " +
      "EmailOctopus documents its contents as subject to change, so never take it apart.",
  },
];

/** The `output` fragment every paginated action reuses. */
export const PAGE_OUTPUT = [
  { key: "data", type: "array" as const, label: "Results for this page" },
  {
    key: "paging",
    type: "object" as const,
    label: "Cursor envelope — `paging.next` is absent on the last page",
  },
];

/** The contact status vocabulary, shared by reads and writes. */
export const CONTACT_STATUS_OPTIONS = [
  { value: "subscribed", label: "Subscribed" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "pending", label: "Pending (awaiting double opt-in)" },
];

export type ContactStatus = "subscribed" | "unsubscribed" | "pending";

/** RFC 7807 problem document, as returned by every EmailOctopus v2 error. */
export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number | string;
  type?: string;
  errors?: Array<{ detail?: string; pointer?: string; parameter?: string }>;
}

/**
 * Turn a parsed error body into one human line.
 *
 * Deliberately includes `type`: the status code alone is ambiguous here.
 * Measured against the live API on 2026-08-11, both of these are HTTP 401 and
 * only the body separates them —
 *
 *   no header at all → `{"detail":"Full authentication is required to access
 *                        this resource.","type":"/errors/401"}`
 *   bad bearer token → `{"detail":"Invalid key.",
 *                        "type":".../api-documentation/v2#unauthorized"}`
 *
 * Note the first `type` is a *relative* path that the spec's enum does not
 * list, which is why nothing in this app matches on `type` exactly.
 */
export function describeError(status: number, body: ProblemDetails | null, raw: string): string {
  if (!body) return raw.slice(0, 300);
  const parts = [body.detail ?? body.title ?? `HTTP ${status}`];
  for (const e of body.errors ?? []) {
    const at = e.pointer ?? e.parameter;
    parts.push(at ? `${at}: ${e.detail}` : `${e.detail}`);
  }
  if (body.type) parts.push(`(${body.type})`);
  return parts.join(" ");
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * No credential is ever touched here. `content-type: application/json` is set
 * only when there is a body — EmailOctopus documents a dedicated
 * `unsupported-media-type` error for a JSON payload sent without it, and
 * sending it on a bodyless DELETE is pointless noise.
 */
export class EmailOctopusClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    if (!res.ok) {
      let raw = "";
      try {
        raw = await res.text();
      } catch { /* body already consumed or unreadable */ }
      let parsed: ProblemDetails | null = null;
      try {
        parsed = raw ? JSON.parse(raw) as ProblemDetails : null;
      } catch { /* non-JSON body: the request probably never reached the API */ }
      throw new Error(
        `EmailOctopus ${res.status} for ${options.method ?? "GET"} ${url.pathname}: ${
          describeError(res.status, parsed, raw)
        }`,
      );
    }

    // 204 on every delete and on the automation queue endpoint.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Path-segment encoder.
 *
 * List and campaign ids are UUIDs and field/tag ids are user-authored strings —
 * a tag may legitimately contain a space or a slash, so every interpolated
 * segment goes through this.
 */
export function seg(value: string): string {
  return encodeURIComponent(value);
}
