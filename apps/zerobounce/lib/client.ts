import type { HookContext } from "@w6w/types";

/**
 * ZeroBounce Email Validation API v2.
 *
 * Verified 2026-09-05 against the vendor's own docs at
 * `https://www.zerobounce.net/docs/email-validation-api-quickstart` (a
 * server-rendered Next.js page whose Postman-collection JSON is embedded in
 * the raw HTML) and cross-checked against the live Statuspage feed at
 * `https://status.zerobounce.net/api/v2/summary.json`.
 *
 * ## Three regional hosts, not one
 *
 * ZeroBounce serves the *same* v2 surface from three separate hostnames, and
 * which one a request hits is a genuine data-residency choice, not a CDN
 * routing detail:
 *
 *   - `api.zerobounce.net`    — the documented default.
 *   - `api-us.zerobounce.net` — "uses servers located within the United
 *     States. By utilizing this endpoint, you acknowledge and consent to your
 *     data being processed on servers in the United States." (verbatim from
 *     the docs, repeated on every endpoint that offers it).
 *   - `api-eu.zerobounce.net` — the EU-resident equivalent.
 *
 * All three are live Statuspage components (`API`, `API-US`, `API-EU` at
 * `status.zerobounce.net`), so this is a real, monitored split rather than a
 * documentation artifact. Every action here takes an optional `region` param
 * (default: the default host) so a caller can pin data residency without
 * juggling base URLs by hand.
 *
 * ## The API key travels two different ways depending on the verb
 *
 * Every GET endpoint (`/v2/validate`, `/v2/getcredits`, `/v2/getapiusage`)
 * takes `api_key` as a URL query parameter. `POST /v2/validatebatch`,
 * however, expects `api_key` as a field *inside the JSON request body*
 * alongside `email_batch` — there is no query-string form documented or
 * accepted for it. A client that always appends `api_key` to the query
 * string (the natural generalization from the GET endpoints) silently sends
 * an unauthenticated batch request. See `auth/api-key.ts`'s `sign` hook,
 * which branches on whether the outbound request already carries a JSON
 * body.
 *
 * ## Errors are a body shape, not a status code
 *
 * Nowhere in the vendor's docs is an HTTP status code named for an error
 * response — every "Error Response" example shown (`{"Credits":-1}` for
 * `getcredits`, `{"error":"Invalid API Key or your account ran out of
 * credits"}` for `validate`, `{"email_batch":[],"errors":[{"error":...,
 * "email_address":"all"}]}` for `validatebatch`) is presented with no status
 * annotation at all, in contrast to the "Successful Response" example right
 * above it. Treat the JSON body as authoritative and never gate success on
 * `res.ok`/the status code alone — see `request()` below, and `auth/api-key.ts`
 * `test`, which reads `Credits` even when the host answers with something
 * other than 200.
 *
 * ## `GET /v2/validate` recently grew a POST form
 *
 * "Starting September 3, 2026, this endpoint also accepts POST. Use the same
 * parameters as GET, sent in the request body as
 * application/x-www-form-urlencoded." (verbatim from the docs, dated two
 * days before this app was written). This app still uses GET, which every
 * SDK example and the endpoint's full history support unconditionally.
 *
 * ## Never consumes a credit for an `unknown` result
 *
 * Both `/v2/validate` and `/v2/validatebatch` document "will never consume a
 * credit for any unknown result" — worth knowing before assuming a bulk
 * validation run's cost from its input size alone.
 */

export const HOSTS = {
  default: "api.zerobounce.net",
  us: "api-us.zerobounce.net",
  eu: "api-eu.zerobounce.net",
} as const;

export type Region = keyof typeof HOSTS;

export const REGION_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "us", label: "US only (data residency)" },
  { value: "eu", label: "EU only (data residency)" },
];

export function hostFor(region?: string): string {
  return HOSTS[(region as Region) ?? "default"] ?? HOSTS.default;
}

export interface RequestOptions {
  method?: string;
  region?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** A body carrying either shape of error ZeroBounce documents. */
interface ZeroBounceErrorBody {
  error?: string;
  errors?: Array<{ error?: string; email_address?: string }>;
}

/**
 * Turn a ZeroBounce error body into one readable line. Exported so
 * `auth/api-key.ts` can reuse the same reading for its own liveness probe.
 */
export function formatZeroBounceError(status: number, path: string, body: unknown): string {
  const parsed = body as ZeroBounceErrorBody | null;
  if (parsed?.error) {
    return `ZeroBounce ${status} for ${path}: ${parsed.error}`;
  }
  if (parsed?.errors?.length) {
    const parts = parsed.errors.map((e) => `${e.email_address ?? "?"}: ${e.error ?? "error"}`);
    return `ZeroBounce ${status} for ${path}: ${parts.join("; ")}`;
  }
  return `ZeroBounce ${status} for ${path}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `api_key` itself — the runtime
 * routes every request through the Auth `sign` hook, which injects it either
 * as a query parameter or into the JSON body depending on the verb (see the
 * module doc above).
 */
export class ZeroBounceClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const host = hostFor(options.region);
    const url = new URL(`https://${host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // Not JSON — fall through; `parsed` stays undefined.
      }
    }

    // Classify from the body, not just `res.ok`: ZeroBounce documents its
    // error shapes with no HTTP status annotation at all (see module doc).
    // Only the flat `{"error": "..."}` shape (an account-wide failure — bad
    // key, out of credits) is treated as fatal here. `validatebatch`'s
    // `{"email_batch": [...], "errors": [...]}` envelope can carry a mix of
    // successful and per-item-failed results in one 200, so that shape is
    // returned as-is for the calling action to inspect rather than thrown.
    const errorBody = parsed as ZeroBounceErrorBody | null;
    if (!res.ok || errorBody?.error) {
      throw new Error(formatZeroBounceError(res.status, url.pathname, parsed ?? text));
    }

    return parsed as T;
  }
}
