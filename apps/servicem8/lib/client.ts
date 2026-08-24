import type { HookContext } from "@w6w/types";

/**
 * ServiceM8 REST API client (`api.servicem8.com/api_1.0`).
 *
 * Everything in this module was verified on 2026-08-24 against ServiceM8's own
 * machine-readable OpenAPI 3.1 document — embedded in every `/docs/reference*`
 * page on `developer.servicem8.com` (a ReadMe.io site; the document itself is
 * identical across those pages, only the highlighted operation differs) — plus
 * the prose guides (`authentication`, `filtering`, `pagination`, `field-types`,
 * `http-response-codes`) and live probes against `api.servicem8.com`. Nothing
 * here came from a third-party integration directory.
 *
 * ## One host, one prefix, no regional split
 *
 * The document declares exactly one server, `https://api.servicem8.com/api_1.0`.
 * There is no sandbox environment and nothing about the host is derived from
 * the credential.
 *
 * ## The create/update response carries NO record data
 *
 * `POST /{resource}.json` (create) and `POST /{resource}/{uuid}.json` (update)
 * both answer `{"errorCode": 0, "message": "OK"}` on success — the vendor's
 * generic `Result` schema, never the record itself. The only thing a create
 * response adds is the new row's id, in the **`x-record-uuid` response header**,
 * not the body. An integration that expects the created/updated object back
 * (as most REST APIs return) gets an empty acknowledgement instead and has to
 * follow up with a `GET /{resource}/{uuid}.json` — this app's create actions
 * return `{uuid}` for exactly that reason, and never a promise of full fields.
 *
 * ## DELETE archives; it does not erase
 *
 * `DELETE /{resource}/{uuid}.json` is documented as "successfully archived
 * (soft deleted)" — it sets `active` to `0`, the same flag every record already
 * exposes for filtering. The row and its history remain, still reachable by a
 * direct `GET .../{uuid}.json` and still returned by a list call that does not
 * filter on `active`. Nothing here should be read as "gone".
 *
 * ## Pagination is a raw UUID cursor, not a page number
 *
 * `pagination.md`: send `cursor=-1` on the first request; each response holds
 * up to 1,000 records; the next cursor comes back as the **`x-next-cursor`**
 * response header (a UUID, opaque — never a byte offset or page index); its
 * absence means the last page was just read. There is no page-size parameter
 * documented for any endpoint in this app except `ServiceTemplate` (out of
 * scope here), so none is exposed.
 *
 * ## Filtering: a real but narrow OData-ish dialect
 *
 * `?$filter={field} {op} {value}`, up to 10 conditions joined with a literal
 * `and` (no `or`, no `not`, no parentheses — `filtering.md` states these as hard
 * limits, not omissions). Only four operators exist: `eq`, `ne`, `gt`, `lt` —
 * there is no `ge`/`le`. String values are single-quoted
 * (`status eq 'Work Order'`); numbers are bare. Every list operation in this
 * app's OpenAPI document carries the identical "This endpoint supports result
 * filtering" note, so `$filter` is offered everywhere rather than guessed
 * per-endpoint.
 *
 * `$sort` (`filtering.md`'s own worked example: `$sort=due_date desc`) is
 * likewise offered on every list action, though — unlike `$filter` — it is not
 * named in the OpenAPI parameter list for any operation, only demonstrated in
 * the prose guide.
 *
 * ## Errors: JSON only once a credential reaches the server
 *
 * A request carrying a (right or wrong) `X-Api-Key` gets ServiceM8's own
 * `{"errorCode": <number>, "message": "..."}` shape on every documented error
 * response (400/401/403/429/500). A request with **no** credential at all gets
 * a completely different, undocumented shape: a **plain-text** `401` body
 * (`"Authorization Required"`, `content-type: text/html`) with a stray
 * `WWW-Authenticate: Basic realm="ServiceM8 API"` header — measured live,
 * 2026-08-24. `formatServiceM8Error` handles both rather than assuming the
 * documented JSON shape always parses.
 *
 * ## An undocumented Basic-Auth fallback is live and is NOT used here
 *
 * The same `WWW-Authenticate: Basic` header above is not decorative: sending
 * `Authorization: Basic base64(email:password)` gets a *third*, distinct 401
 * body — `"Invalid username or password"` — proving the gateway actually
 * evaluates it rather than ignoring the scheme. `authentication.md` documents
 * only the `X-Api-Key` header and OAuth2 as current methods; it says nothing
 * about a user's own login password being accepted at this API. This app does
 * not implement that path: it is unconfirmed as a supported, non-deprecated
 * credential and storing an account's actual login password is worse practice
 * than an API key even if it is accepted.
 */

/** The one and only API origin + version prefix. */
export const API_BASE = "https://api.servicem8.com/api_1.0";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** One page of a cursor-paginated list. */
export interface ServiceM8Page<T> {
  items: T[];
  /** From the `x-next-cursor` response header. Absent on the last page. */
  nextCursor?: string;
}

/** The generic `{errorCode, message}` envelope every JSON response uses. */
export interface ServiceM8Result {
  errorCode?: number;
  message?: string;
}

/**
 * Drop keys the caller left unset. `false` and `0` survive — both can be
 * meaningful filter/body values, and dropping them would make them
 * inexpressible.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Build one `$filter` condition. Values are quoted per `field-types.md` /
 * `filtering.md`: strings in single quotes, numbers and the `active` flag
 * bare. A caller building several conditions joins them with literal `" and "`
 * — the only supported combinator, per the vendor's own stated limit of no
 * `or` and no parentheses.
 */
export function filterCondition(
  field: string,
  op: "eq" | "ne" | "gt" | "lt",
  value: string | number,
): string {
  const rendered = typeof value === "number"
    ? String(value)
    : `'${String(value).replace(/'/g, "''")}'`;
  return `${field} ${op} ${rendered}`;
}

/** Path-escape a caller-supplied UUID so a stray `/` or `?` cannot rewrite the request path. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn any of ServiceM8's response bodies into one actionable line.
 *
 * Tries the documented `{errorCode, message}` JSON shape first; falls back to
 * the raw text for the undocumented plain-text 401s (missing credential,
 * Basic-auth mismatch) rather than pretending they are JSON.
 */
export function formatServiceM8Error(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ServiceM8Result | null = null;
  try {
    parsed = JSON.parse(raw) as ServiceM8Result;
  } catch { /* not JSON — a plain-text body, handled below */ }

  const head = `ServiceM8 ${status} for ${method} ${path}`;
  if (parsed?.message) {
    const code = parsed.errorCode !== undefined ? ` (errorCode ${parsed.errorCode})` : "";
    const rateLimitNote = status === 429
      ? " ServiceM8 limits API usage to 180 requests/minute and 20,000 requests/day per app+account."
      : "";
    return `${head}${code}: ${parsed.message}.${rateLimitNote}`;
  }
  return truncate(`${head}: ${raw || "(empty body)"}`, 1000);
}

export class ServiceM8Client {
  constructor(private ctx: HookContext) {}

  /** Parse and return the JSON body. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * A `GET /{resource}.json` list call, folded into `{items, nextCursor}`.
   *
   * `cursor` should be `-1` on the first call; pass the returned `nextCursor`
   * back in to read the next page, and stop once it is `undefined`.
   */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<ServiceM8Page<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    const items = text ? (JSON.parse(text) as T[]) : [];
    const nextCursor = res.headers.get("x-next-cursor") ?? undefined;
    return { items, nextCursor };
  }

  /**
   * `POST /{resource}.json` — create. Returns only the new row's `uuid` (from
   * the `x-record-uuid` response header): the body carries no record fields,
   * only ServiceM8's generic `{errorCode, message}` acknowledgement.
   */
  async create(path: string, body: unknown): Promise<{ uuid?: string; result: ServiceM8Result }> {
    const res = await this.send(path, { method: "POST", body });
    const text = await res.text();
    const result = text ? (JSON.parse(text) as ServiceM8Result) : {};
    return { uuid: res.headers.get("x-record-uuid") ?? undefined, result };
  }

  /**
   * `POST /{resource}/{uuid}.json` — update. Same empty-body acknowledgement
   * as create; the caller already knows the uuid, so nothing else is returned.
   */
  async update(path: string, body: unknown): Promise<ServiceM8Result> {
    return await this.json<ServiceM8Result>(path, { method: "POST", body });
  }

  /**
   * `DELETE /{resource}/{uuid}.json` — soft-archives the record (`active` ->
   * `0`). Not a hard delete; see the module note above.
   */
  async archive(path: string): Promise<ServiceM8Result> {
    return await this.json<ServiceM8Result>(path, { method: "DELETE" });
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    // No `X-Api-Key` here, ever: the runtime routes this request through the
    // Auth `sign` hook, which is the only code handed the credential.
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatServiceM8Error(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
