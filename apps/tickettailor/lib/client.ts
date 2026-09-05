import type { HookContext } from "@w6w/types";

/**
 * Ticket Tailor API v1 REST client.
 *
 * Everything here was verified on 2026-09-05 against the vendor's own OpenAPI
 * 3.1.1 document — served from `https://app.tickettailor-stitching.com/openapi.yml`,
 * the source Docusaurus (`developers.tickettailor.com`) compiles its reference
 * pages from, fetched live (311,543 bytes) — plus live probes against
 * `api.tickettailor.com`. Nothing here came from a third-party integration
 * directory.
 *
 * ## Auth: the docs show two DIFFERENT recipes for the same header
 *
 * The public reference page's "Header" tab says to send
 * `Authorization: Basic Base64Encode(api_key)` — literally the key alone, no
 * colon. Its own "Username" tab, one click away, shows `curl -u 'API_KEY:'` —
 * the RFC-standard `base64("username:password")` with the key as username and
 * an empty password. The two are NOT the same bytes on the wire. The OpenAPI
 * document resolves the ambiguity: `securitySchemes.BasicAuth` declares
 * `type: http, scheme: basic`, which is defined (RFC 7617) as
 * `base64(username ":" password)`. This client sends that form —
 * `base64("${apiKey}:")` — matching the "Username" tab and the OAS security
 * scheme, not the "Header" tab's prose. A live probe with a syntactically
 * bogus key sent both ways got byte-identical `403 FORBIDDEN` responses (the
 * server does not need a real key to look identical), so this could not be
 * disambiguated by a probe alone — the OAS scheme type is the deciding source.
 *
 * ## Every write is a form post, not JSON
 *
 * Every `requestBody` in the spec is declared
 * `content: application/x-www-form-urlencoded`, never `application/json` —
 * `POST`s ship `Content-Type: application/x-www-form-urlencoded` bodies here.
 * Sending JSON to any write endpoint is a common way to lose an afternoon to
 * this API: no endpoint declares a JSON request body at all.
 *
 * ## Updates are POST, and deletes answer 200 with a body — never 204
 *
 * There is no `PATCH` or `PUT` anywhere in the document; every "update"
 * operation is `POST` to the resource's own URL (`POST /v1/discounts/{id}`,
 * not `PATCH`). Every `DELETE` operation's *documented* success status is
 * `200`, with a small JSON body (`{id, object, deleted}` — see
 * {@link DeleteResult}), not the `204 No Content` a REST convention would
 * suggest.
 *
 * ## Pagination
 *
 * Cursor-based: `starting_after` / `ending_before` name an object id, `limit`
 * caps page size. A list envelope is `{data: [...], links: {next, previous}}`
 * where `next`/`previous` are full relative URLs
 * (`"/v1/orders?starting_after=or_223"`) or `null` at the ends — this client
 * exposes {@link nextCursor} to pull just the cursor value back out.
 *
 * ## Errors
 *
 * Every failure is `{status, error_code, message, hint?, errors?}` — verified
 * live: an unauthenticated or wrongly-authenticated request to
 * `GET /v1/overview` and to `GET /v1/orders` both answered
 * `403 {"error_code":"FORBIDDEN", "message":"You do not have permission to
 * perform the request.", "hint": "..."}`, byte-identical whether the
 * `Authorization` header was missing, malformed, or a syntactically-plausible
 * wrong key. `error_code` is otherwise a stable machine string
 * (`VALIDATION_ERROR`, …) and `errors[]` (present on some `POST` validation
 * failures) names the offending field. See {@link formatTicketTailorError}.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.tickettailor.com";

/** Every documented path carries this prefix. */
export const API_PREFIX = "/v1";

/**
 * Inlined base64 encoder — the app sandbox runs actions with `import: false`,
 * so a JSR/npm encoding package cannot be pulled in at runtime. `btoa` is a
 * standard Web API available without any permission grant. Output matches
 * `@std/encoding`'s `encodeBase64`: standard alphabet, `=` padding.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * The one place the wire format is built. Exported so `auth/api-key.ts`'s
 * `sign` and `test` hooks, and this module's error-classification helper,
 * exercise the same code path — see the header note above for why this is
 * `base64("key:")`, not `base64("key")`.
 */
export function basicAuthHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`${apiKey}:`)}`;
}

/** A scalar or list a form field may carry. `undefined`/`null`/`""` are dropped. */
export type FormValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | string[]
  | Record<string, string | number | boolean | undefined | null>;

/**
 * Build an `application/x-www-form-urlencoded` body from a plain object.
 *
 * Arrays are sent PHP-style, repeated with a `[]` suffix
 * (`ticket_types[]=tt_1&ticket_types[]=tt_2`), and plain objects are sent as
 * bracket-keyed maps (`ticket_type_id[tt_1]=1&ticket_type_id[tt_2]=0`) — the
 * shape the OpenAPI document's own `additionalProperties` association maps
 * (e.g. `discounts: {di_123: "1", di_456: "0"}` on `updateDiscountById`)
 * describe. This convention was NOT reachable in a live probe — every
 * authenticated write needs a real API key this app was not given one to
 * test with — but every code sample in the vendor's docs is PHP (Guzzle /
 * `curl` built from PHP arrays), and bracket notation is the standard PHP
 * (and Laravel, which Ticket Tailor's error-shape and validation messages
 * read like) encoding for both cases. Stated here rather than silently
 * assumed: if a write carrying an array or association map ever 422s in
 * practice, this is the first thing to re-check against a real account.
 */
export function toFormBody(fields: Record<string, FormValue>): string {
  const parts: string[] = [];
  const push = (key: string, value: string) =>
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        push(`${key}[]`, String(item));
      }
    } else if (typeof value === "object") {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue === undefined || subValue === null || subValue === "") continue;
        push(`${key}[${subKey}]`, String(subValue));
      }
    } else {
      push(key, String(value));
    }
  }
  return parts.join("&");
}

/** Drop query params the caller left unset; everything else stringifies as-is. */
export function compactQuery(
  query: Record<string, string | number | boolean | undefined | null>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

/** Normalise a `multiselect`/comma-string param into a plain list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Pull the pagination cursor value back out of a `links.next`/`links.previous` URL. */
export function nextCursor(link: string | null | undefined): string | undefined {
  if (!link) return undefined;
  try {
    const url = new URL(link, API_BASE);
    return url.searchParams.get("starting_after") ?? url.searchParams.get("ending_before") ??
      undefined;
  } catch {
    return undefined;
  }
}

export interface TicketTailorListLinks {
  next?: string | null;
  previous?: string | null;
}

export interface TicketTailorListPage<T> {
  data: T[];
  links?: TicketTailorListLinks;
}

/** The `DELETE`/`void` success body — always `200`, never `204`. See module docs. */
export interface DeleteResult {
  id: string;
  object: string;
  deleted?: string;
  voided?: string;
  hidden?: string;
}

interface TicketTailorErrorField {
  field?: string;
  value?: unknown;
  messages?: string[];
}

interface TicketTailorErrorBody {
  status?: number;
  error_code?: string;
  message?: string;
  hint?: string;
  errors?: TicketTailorErrorField[];
}

/**
 * Turn Ticket Tailor's error body into one actionable line.
 *
 * `error_code` and `hint` are kept verbatim — `hint` in particular is where
 * this vendor puts its (only) guidance for the collapsed `FORBIDDEN` case
 * (missing key, invalid key, deleted key, and a key correctly scoped away
 * from the resource all answer identically; see the module docs and
 * `auth/api-key.ts`). Per-field `errors[]`, present on some validation
 * failures, is joined in because "one or more fields failed validation" alone
 * names nothing.
 */
export function formatTicketTailorError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: TicketTailorErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as TicketTailorErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message && !parsed?.error_code) {
    return `Ticket Tailor ${status} for ${method} ${path}: ${truncate(raw)}`;
  }

  const fieldDetail = (parsed.errors ?? [])
    .map((e) => `${e.field ?? "?"}: ${(e.messages ?? []).join(", ")}`)
    .filter((s) => s.trim() !== "?: ")
    .join("; ");

  const parts = [
    `Ticket Tailor ${status}${
      parsed.error_code ? ` ${parsed.error_code}` : ""
    } for ${method} ${path}`,
    parsed.message,
    fieldDetail || undefined,
    parsed.hint,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Sent as an `application/x-www-form-urlencoded` body — see module docs. */
  form?: Record<string, FormValue>;
}

export class TicketTailorClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(compactQuery(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = toFormBody(options.form);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        formatTicketTailorError(res.status, init.method ?? "GET", url.pathname, text),
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
