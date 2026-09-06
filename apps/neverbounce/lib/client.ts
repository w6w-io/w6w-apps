import type { HookContext } from "@w6w/types";

/**
 * NeverBounce Email Verification API v4.2.
 *
 * Verified 2026-09-06 against the vendor's own OpenAPI 3.1 definition, which
 * ReadMe.io embeds directly in `https://developers.neverbounce.com/reference/*`'s
 * server-rendered HTML (`<script id="ssr-props" type="application/x-ssr-props">`
 * → `document.api.schema`) — the getting-started page names "OpenAPI" but links
 * no download; this is that same spec, read straight out of the page rather
 * than guessed from prose. Every path/param/response below traces to it, not
 * to the human-readable docs alone.
 *
 * ## One host, one version, in the URL path
 *
 * `https://api.neverbounce.com/v4.2` — no per-account or per-region host
 * variants (unlike, say, ZeroBounce's US/EU split). `docs/versioning` states
 * the version segment changes only on a breaking release, so it is baked into
 * `BASE_PATH` rather than exposed as a per-action param.
 *
 * ## The API key travels two different ways depending on the verb
 *
 * The OAS `securityScheme` declares `apiKey` in the query string, named `key`
 * — accurate for every `GET` endpoint. But every documented `POST` example
 * (`/jobs/create`, `/jobs/parse`, `/jobs/start`, `/jobs/delete`) sends `key` as
 * a field *inside* the request body instead (form-encoded in the curl sample,
 * but the same operations also declare an `application/json` request body in
 * the OAS, which is the form this app uses). A client that always appends
 * `key` to the query string would silently send an unauthenticated POST. See
 * `auth/api-key.ts`'s `sign` hook, which branches on whether the outbound
 * request already carries a JSON body — the same fix this pack already
 * shipped once for ZeroBounce's identical split.
 *
 * ## Errors are almost always a 200 with a `status` field, not an HTTP code
 *
 * Per `docs/error-handling`: "All `2xx` level responses will contain a
 * `status` property... When an error does occur a `message` property will be
 * included... **These error messages will be returned with a 200 level status
 * code.**" The documented status values are `success`, `general_failure`,
 * `auth_failure`, `temp_unavail`, `throttle_triggered`, and `bad_referrer` —
 * none of them assigned a distinct HTTP status in the docs or in the OAS
 * response examples (which show only a 200 case and an undifferentiated,
 * empty-bodied 400 the docs never otherwise mention). `request()` below
 * therefore classifies from the JSON body's `status` field, never from
 * `res.ok` alone — the same reading `auth/api-key.ts`'s `test` hook applies to
 * the exact same endpoint.
 *
 * A genuine transport-level HTTP error is still possible and still documented
 * separately — `docs/error-handling` calls out `413 Entity Too Large` for an
 * oversized `/jobs/create` body — so a non-2xx with no parseable `status`
 * field is still treated as fatal.
 *
 * ## `GET /jobs/download` is the one endpoint that isn't JSON
 *
 * It returns `application/octet-stream` (a CSV file), and the docs say so
 * explicitly ("the API explorer is not available"). It is handled by its own
 * `downloadCsv` method below rather than `request()`, which assumes JSON.
 *
 * ## `/poe/confirm` is deliberately out of scope
 *
 * It exists in the OAS (`operationId: widget-poe-confirm`) but is the
 * server-side confirmation half of NeverBounce's client-side JS *widget*
 * flow — the `transaction_id`/`confirmation_token` pair is minted by that
 * widget in the end user's browser, not something a workflow action could
 * supply on its own. See the README.
 */

export const HOST = "api.neverbounce.com";
export const BASE_PATH = "/v4.2";

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Every documented JSON response carries at least these two fields. */
export interface NeverBounceResult {
  status: string;
  message?: string;
  execution_time?: number;
  [key: string]: unknown;
}

/** The `status` values `docs/error-handling` documents for a non-`success` response. */
export type NeverBounceErrorStatus =
  | "general_failure"
  | "auth_failure"
  | "temp_unavail"
  | "throttle_triggered"
  | "bad_referrer";

export function formatNeverBounceError(path: string, status: string, message?: string): string {
  return message
    ? `NeverBounce ${path} returned status "${status}": ${message}`
    : `NeverBounce ${path} returned status "${status}"`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `key` itself — the runtime routes
 * every request through the Auth `sign` hook, which injects it either as a
 * query parameter or into the JSON body depending on the verb (see the module
 * doc above).
 */
export class NeverBounceClient {
  constructor(private ctx: HookContext) {}

  async request<T extends NeverBounceResult = NeverBounceResult>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`https://${HOST}${BASE_PATH}${path}`);
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
    const text = await res.text();
    let parsed: NeverBounceResult | null = null;
    try {
      parsed = JSON.parse(text) as NeverBounceResult;
    } catch {
      // Not JSON — fall through; `parsed` stays null.
    }

    if (!parsed || typeof parsed.status !== "string") {
      throw new Error(
        `NeverBounce ${url.pathname} returned ${res.status}: ${text || res.statusText}`,
      );
    }
    if (parsed.status !== "success") {
      throw new Error(formatNeverBounceError(url.pathname, parsed.status, parsed.message));
    }
    return parsed as T;
  }

  /**
   * `GET /jobs/download` — the one endpoint that answers CSV, not JSON. On a
   * documented failure it can still answer JSON (`{"status": "auth_failure", ...}`),
   * so a JSON-looking body with a non-`success` status is still surfaced as an
   * error rather than returned as if it were CSV data.
   */
  async downloadCsv(
    query: Record<string, string | number | boolean | undefined | null>,
  ): Promise<string> {
    const url = new URL(`https://${HOST}${BASE_PATH}/jobs/download`);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await this.ctx.fetch(url.toString(), { headers: { accept: "text/csv" } });
    const text = await res.text();

    let parsed: NeverBounceResult | null = null;
    try {
      parsed = JSON.parse(text) as NeverBounceResult;
    } catch {
      // Not JSON — the expected shape for a successful CSV response.
    }
    if (parsed && typeof parsed.status === "string" && parsed.status !== "success") {
      throw new Error(formatNeverBounceError(url.pathname, parsed.status, parsed.message));
    }
    if (!res.ok && !parsed) {
      throw new Error(`NeverBounce ${url.pathname} returned ${res.status}: ${res.statusText}`);
    }
    return text;
  }
}
