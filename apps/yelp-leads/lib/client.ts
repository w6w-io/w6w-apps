import type { HookContext } from "@w6w/types";

/**
 * Yelp Leads API client — `api.yelp.com/v3/leads/*` and
 * `api.yelp.com/v3/businesses/{id}/lead_ids`.
 *
 * Every path, method, query parameter, request body and response shape in
 * this app was read off Yelp's own machine-readable OpenAPI 3.1 document,
 * embedded server-side in each reference page at `docs.developer.yelp.com`
 * (`window.__...` React hydration payload, not a third-party directory) —
 * fetched and diffed 2026-09-06 for all seven Leads endpoints plus the OAuth
 * token/revoke endpoints. The rendered "server URL" shown on each reference
 * page (`data-testid="serverurl"`) was cross-checked against the OpenAPI
 * `servers` + `paths` entries and against the prose "send a GET request to
 * `https://api.yelp.com/v3/...`" example on every page; all three agree.
 *
 * ## One host for the Leads surface, a second for token introspection
 *
 * Every Leads endpoint — `GET/POST /v3/leads/{ID}...`,
 * `GET /v3/businesses/{business_id}/lead_ids` — lives on `api.yelp.com`. The
 * OAuth token exchange also lives there (`POST /oauth2/token/v3`), so the
 * host mediates that implicitly as the `authorizationUrl`/`tokenUrl` hosts
 * (`build-a-w6w-app.md`: "OAuth endpoint hosts are allowed implicitly").
 *
 * `GET /token/v1/businesses` — "which businesses does this access token
 * reach" — is a *separate* Yelp host, `partner-api.yelp.com`, documented at
 * `docs.developer.yelp.com/reference/get-businesses-associated-with-an-access-token`.
 * It is the only endpoint in this app's surface that needs no path parameter
 * at all, which is what makes it the auth `test`/health probe (see
 * `auth/oauth2.ts`) — every Leads endpoint proper needs either a Lead ID or a
 * Business ID that Yelp gives no way to discover from the token alone.
 *
 * ## Errors are one shape, everywhere
 *
 * Every documented 4xx/5xx on every endpoint in this surface answers
 * `{"error": {"code", "description", "field"?}}` — verified against the
 * OpenAPI `Error404`/`RequestBodyValidationFailureResponse` schemas shared by
 * all seven operations. `formatYelpError` renders `code: description`
 * (falling back to the raw HTTP status when the body doesn't parse), so a
 * caller sees Yelp's own diagnosis rather than a bare "400".
 *
 * ## Rate limiting is prose-only
 *
 * "All the Leads API endpoints have a default rate limit of 5 requests per
 * second per client per endpoint" (`docs.developer.yelp.com/docs/leads-api`,
 * "Rate Limiting" section) — no response header of any kind is documented
 * for it, and the OpenAPI document declares no `X-RateLimit-*` header on any
 * response. `health/quota.ts` declares this unavailable rather than guessing
 * at a header that was never observed.
 */

/** The Leads API's one and only origin + version prefix. */
export const API_URL = "https://api.yelp.com/v3";

/** Token-introspection host — distinct from the Leads API host itself. */
export const PARTNER_API_URL = "https://partner-api.yelp.com";

export interface YelpErrorBody {
  error?: {
    code?: string;
    description?: string;
    field?: string;
  };
}

/**
 * Render a Yelp error body the way every one of this app's endpoints emits
 * it. Falls back to the bare HTTP status when the body isn't Yelp's documented
 * shape (a proxy 502, a truncated body, …) rather than throwing a second
 * error while trying to describe the first.
 */
export function formatYelpError(status: number, body: unknown): string {
  const err = (body as YelpErrorBody | null)?.error;
  if (err?.code || err?.description) {
    const parts = [err.code, err.description].filter(Boolean).join(": ");
    return err.field ? `${parts} (field: ${err.field})` : parts;
  }
  return `Yelp returned HTTP ${status}`;
}

export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset; `false` and `0` still count as set. */
export function compactQuery(query: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/**
 * One request against the Leads API, JSON in and out, error bodies parsed
 * and rendered via {@link formatYelpError}. `sign` (the OAuth `auth` method)
 * injects `Authorization`; nothing here ever touches a credential.
 */
export async function yelpRequest<T>(
  ctx: HookContext,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(compactQuery(options.query))) {
      url.searchParams.set(k, v);
    }
  }

  const res = await ctx.fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(formatYelpError(res.status, parsed));
  }
  return parsed as T;
}

/** Yelp Lead ID, as documented on `RequiredLeadID`. Path-escaped before use. */
export function encodeLeadId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/** Yelp Business ID, as documented on `RequiredBusinessID`. Path-escaped before use. */
export function encodeBusinessId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}
