import type { HookContext } from "@w6w/types";

/**
 * Planning Center REST client.
 *
 * Everything here was verified on 2026-09-05 against Planning Center's own
 * machine-readable OpenAPI 3.x documents — fetched live from
 * `https://api.planningcenteronline.com/{product}/v2/open_api/{version}` for
 * People (`2026-06-04`), Calendar (`2026-06-22`), Giving (`2019-10-18`),
 * Check-Ins (`2025-05-28`) and Current (`2018-08-01`) — plus live probes
 * against `api.planningcenteronline.com` itself and against
 * `status.planningcenter.com`. Nothing here came from a marketing page or a
 * third-party integration directory.
 *
 * ## One host, per-product path prefixes
 *
 * Every product is its OWN JSON-API-conformant application mounted under the
 * same host: `https://api.planningcenteronline.com/{product}/v2`. There is no
 * per-tenant subdomain — the organization is implied entirely by the
 * credential, never by the host. This app only calls
 * `api.planningcenteronline.com`, so that is the only entry in
 * `w6w.network.allow`.
 *
 * ## Auth: two schemes sharing one wire format family
 *
 * A **Personal Access Token** (the scheme this app implements) is a
 * `client_id`/`secret` pair sent as HTTP Basic — `Authorization: Basic
 * base64(client_id:secret)`, credential in the CONVENTIONAL order (unlike e.g.
 * Azure DevOps, which leaves the username empty). It authenticates as
 * whichever user created it, with that user's own permissions, and reaches
 * every product at once — there is no OAuth-style per-product `scope` to
 * request. OAuth2 exists as a documented alternative for apps distributed to
 * *multiple* churches, but it requires an app registration Planning Center
 * issues by hand per organization; this app deliberately ships PAT only. See
 * the README for what that leaves out.
 *
 * ## Every request needs a `User-Agent`
 *
 * "All API requests must include a User-Agent header... If you don't supply a
 * User-Agent header that meets these requirements, your requests may result
 * in a 403 Forbidden response" (Authentication guide, "Specifying a
 * User-Agent header"). Live probes during development answered 401 even
 * without one, but the vendor's own docs single this out as a 403 trap for a
 * request that is otherwise perfectly formed — the credential looks fine, the
 * path is right, and the fix is a header nobody thinks to check. Sent on
 * every request from one place so it can never be forgotten on a new action.
 *
 * ## Errors: JSON-API on some paths, an empty body on others
 *
 * A 422 validation failure and a 429 rate limit both answer
 * `{"errors":[{"code","detail",...}]}` per the JSON-API error spec — verified
 * live for 429 in the vendor's Rate Limiting guide. An unauthenticated or
 * incorrectly authenticated request, however, answers 401 with an EMPTY body
 * (`content-length: 0`, `content-type: text/html`) — measured live against
 * `/current/v2/me` both with no `Authorization` header at all and with a
 * syntactically-valid-but-wrong client_id/secret pair; both came back
 * byte-identical. So there is no body to classify a 401 by, and the vendor's
 * own Errors guide already gives 401 one unambiguous meaning ("You did not use
 * the proper API token and/or secret") — {@link classifyAuthFailure} reads the
 * status for that reason alone, never the body.
 *
 * ## Pagination
 *
 * Every collection endpoint takes `per_page` (max 100, default 25) and
 * `offset`, and reports `meta.total_count` and `meta.next.offset` (also
 * mirrored at `links.next`). The Rate Limiting guide calls out that an
 * `offset` above 30,000 drops into a STRICTER limit (75 requests/20s instead
 * of 100), which matters for anyone paging deep into a large congregation's
 * People list.
 *
 * ## `fields[Type]` sparse fieldsets
 *
 * Several attributes are documented as present in the schema but silent in a
 * real response unless asked for — `Person.primary_email_address` is one
 * ("Only available when requested with the `?fields` param") — yet it is not
 * one of the values Planning Center's own OpenAPI document enumerates as a
 * legal `fields[Person]` member, so requesting it is not something this app
 * can verify will keep working. Rather than gamble on an undocumented-enough
 * parameter, `get-person` reads the email the fully-documented way instead:
 * `?include=emails`, which the JSON-API guide states explicitly and which
 * returns full `Email` resources (with their own `primary` flag) in
 * `included`.
 */

/** The one and only API host. Every product mounts under it. */
export const HOST = "api.planningcenteronline.com";

/** Sent on every request — see the "Every request needs a `User-Agent`" note above. */
export const USER_AGENT = "w6w-planningcenter-app (w6w.io)";

export type Product = "people" | "calendar" | "giving" | "check-ins" | "current";

const PRODUCT_BASE: Record<Product, string> = {
  people: `https://${HOST}/people/v2`,
  calendar: `https://${HOST}/calendar/v2`,
  giving: `https://${HOST}/giving/v2`,
  "check-ins": `https://${HOST}/check-ins/v2`,
  current: `https://${HOST}/current/v2`,
};

export type QueryValue = string | number | boolean | undefined | null;

/**
 * A `where` filter value. A plain value renders as `where[key]=value`; an
 * operator object renders as `where[key][op]=value` — the vendor's own
 * comparison-operator syntax for date/time ranges (`gt`, `gte`, `lt`, `lte`),
 * e.g. `where[received_at][gte]=2026-01-01` (verified against the live
 * OpenAPI parameter names, e.g. `donation_where_received_at_gte_parameter`
 * literally names itself `where[received_at][gte]`).
 */
export type WhereValue = QueryValue | {
  gt?: QueryValue;
  gte?: QueryValue;
  lt?: QueryValue;
  lte?: QueryValue;
};

export interface RequestOptions {
  method?: string;
  /** Plain top-level query params (`per_page`, `offset`, `order`, `include`, …). */
  query?: Record<string, QueryValue>;
  /** Rendered as `where[key]=value`, or `where[key][op]=value` for a range operator. */
  where?: Record<string, WhereValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** JSON-API's standard error shape, used for 422 (validation) and 429 (rate limit). */
export interface JsonApiError {
  code?: string;
  status?: string;
  title?: string;
  detail?: string;
}

interface JsonApiErrorBody {
  errors?: JsonApiError[];
}

/** A JSON-API single-resource envelope. */
export interface JsonApiResource<A = Record<string, unknown>> {
  type: string;
  id: string;
  attributes: A;
  relationships?: Record<
    string,
    { data?: { type: string; id: string } | Array<{ type: string; id: string }> }
  >;
}

export interface JsonApiSingle<A = Record<string, unknown>> {
  data: JsonApiResource<A>;
  included?: JsonApiResource[];
}

export interface JsonApiCollectionMeta {
  total_count?: number;
  count?: number;
  next?: { offset: number };
  prev?: { offset: number };
}

export interface JsonApiCollection<A = Record<string, unknown>> {
  data: Array<JsonApiResource<A>>;
  included?: JsonApiResource[];
  meta?: JsonApiCollectionMeta;
  links?: { self?: string; next?: string; prev?: string };
}

/** Render a query value the way Planning Center expects — booleans as `true`/`false`. */
function stringify(v: QueryValue): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return typeof v === "boolean" ? String(v) : String(v);
}

/** Keep an error message readable — a validation body can carry several errors. */
export function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * `401` is the ONLY status Planning Center answers with no distinguishing
 * body for a rejected credential (see the class doc above) — its own Errors
 * guide states unambiguously what 401 means, so this reads the status, never
 * the empty body, and is exported so `auth/personal-access-token.ts`'s `test`
 * hook classifies a failure exactly the same way `send()` does.
 */
export function classifyAuthFailure(status: number): string | undefined {
  if (status === 401) {
    return 'Planning Center rejected the client_id/secret pair (401) — "You did not use the ' +
      'proper API token and/or secret." Re-copy both halves from your Developer Account, or ' +
      "issue a new Personal Access Token.";
  }
  if (status === 403) {
    return "Planning Center returned 403 Forbidden — the credential is valid but this user's " +
      "role lacks access to the resource being read.";
  }
  return undefined;
}

/** Format a JSON-API error body (422/429) or fall back to the raw text. */
export function formatError(
  status: number,
  method: string,
  path: string,
  bodyText: string,
): string {
  const authMessage = classifyAuthFailure(status);
  if (authMessage) return authMessage;
  let parsed: JsonApiErrorBody | null = null;
  try {
    parsed = bodyText ? (JSON.parse(bodyText) as JsonApiErrorBody) : null;
  } catch {
    // not JSON — fall through to the raw text below
  }
  const detail = parsed?.errors?.map((e) => e.detail ?? e.title).filter(Boolean).join("; ");
  const base = `Planning Center ${method} ${path} returned ${status}`;
  if (detail) return `${base}: ${detail}`;
  if (bodyText) return `${base}: ${truncate(bodyText)}`;
  return base;
}

export class PlanningCenterClient {
  constructor(private ctx: HookContext) {}

  private async send(
    product: Product,
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const url = new URL(`${PRODUCT_BASE[product]}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      const s = stringify(v);
      if (s !== undefined) url.searchParams.set(k, s);
    }
    for (const [k, v] of Object.entries(options.where ?? {})) {
      if (v !== null && typeof v === "object") {
        for (const [op, opv] of Object.entries(v)) {
          const s = stringify(opv as QueryValue);
          if (s !== undefined) url.searchParams.set(`where[${k}][${op}]`, s);
        }
      } else {
        const s = stringify(v);
        if (s !== undefined) url.searchParams.set(`where[${k}]`, s);
      }
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }

  async get<T>(product: Product, path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(product, path, { ...options, method: "GET" });
    return res.json() as Promise<T>;
  }

  async post<T>(product: Product, path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(product, path, { ...options, method: "POST" });
    return res.json() as Promise<T>;
  }
}
