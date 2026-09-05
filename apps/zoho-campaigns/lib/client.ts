import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Campaigns REST API (v1.1) client.
 *
 * Every path, header, parameter and response shape here was verified on
 * 2026-09-05 against Zoho's own developer guide
 * (`https://www.zoho.com/campaigns/help/developers/` and the per-endpoint
 * pages it links to — access-token, list-management and its dozen linked
 * pages, campaign-management and its dozen linked pages, error-codes) and
 * live probes against all eight regional API hosts (see `lib/regions.ts`).
 *
 * ## Every parameter travels as a QUERY STRING value — even on a documented POST
 *
 * Unlike this pack's other Zoho apps (`zoho-invoice`, `zohobooks`, which POST
 * a JSON body), **not one** of Zoho Campaigns' own sample requests — across
 * every endpoint checked, `POST`-labelled or not — shows a request body. Every
 * sample is a full URL with every parameter, including `contactinfo` (itself
 * a JSON- or XML-encoded string), `list_details`, `segments` and
 * `campaigninfo`, appended to the query string. The docs still print
 * `Content-Type: application/x-www-form-urlencoded` in the header block for
 * `POST`-labelled endpoints, but no sample ever demonstrates a body — this
 * client follows the samples literally and never sends one. Getting this
 * backwards (POSTing a JSON body instead) does not error cleanly; the
 * documented parameters are simply never read, and the call fails as if they
 * were never passed (e.g. "903 Mandatory fields are missing").
 *
 * ## A handful of endpoints embed the response format in the PATH, not just the query string
 *
 * `listsubscribe`, `listunsubscribe`, `contactdonotmail` and `clonecampaign`
 * are documented as `/api/v1.1/[xml/json]/<endpoint>` — the format is a path
 * segment, in addition to (redundantly with) the `resfmt` query parameter
 * every other endpoint uses alone. This client always requests the JSON
 * shape, so `jsonPath()` below prefixes those four with `json/`.
 *
 * ## No `organization`/account id anywhere — unlike Zoho Books/Invoice
 * Zoho Campaigns has no multi-organization concept in its API: every
 * documented endpoint acts on the one account the access token authorizes,
 * with no id parameter to pass or discover. There is no `organization-list`
 * action in this app for that reason — there is nothing to list.
 *
 * ## The response envelope is inconsistent, not a `{code, message, <resource>}` wrapper
 *
 * A success carries `{"status": "success", "code": "0" or "200", ...}` with
 * the actual payload inlined at the TOP LEVEL under an endpoint-specific key
 * (`list_of_details`, `recent_campaigns`, `no_of_contacts`, ...) rather than
 * one uniform resource key — so, unlike `zoho-invoice`/`zohobooks`, this
 * client does not attempt a generic "unwrap" helper; each action reads the
 * field(s) its own endpoint documents.
 *
 * A failure is `{"status": "error", "message": "...", "Code": "...",
 * "URI": "..."}` — confirmed live against every regional host with no
 * `Authorization` header and with a syntactically-plausible dead token
 * (both answer identically: `401 {"Code":"1007","message":"Unauthorized
 * request."}`, error code 1007 = "Unauthorized key" per the vendor's own
 * error-codes page). **`Code`/`URI` are capitalized on an error response but
 * lowercase (`code`/`uri`) on success** — confirmed live; `formatCampaignsError`
 * below reads both cases defensively.
 *
 * ## A handful of success responses nest their payload under a `"response"` key
 *
 * Most endpoints' own sample JSON responses inline every field at the top
 * level (`{"status":"success","code":"0","list_of_details":[...]}`) — but
 * `custom/add`, `contact/allfields` AND, unexpectedly, `sendcampaign` all
 * publish a sample response wrapped one level deeper:
 * `{"response":{"code":"0", ...}}`. This is not tied to the `type=json` vs
 * `resfmt=JSON` split (`sendcampaign` uses `resfmt`, same as the flat
 * majority) — it looks like an inconsistency in the vendor's own published
 * examples rather than a rule this app can predict, so `unwrapEnvelope`
 * below reads whichever shape shows up rather than assuming one.
 *
 * ## A minority of endpoints name the format parameter `type`, not `resfmt`
 *
 * `contact/allfields` (Get All Contact Fields) and `custom/add` (Create
 * Custom Field) document a `type=xml|json` parameter instead of `resfmt` —
 * every other endpoint checked uses `resfmt`. `RequestOptions.formatParam`
 * lets those two actions opt into the different name; every other action
 * uses the `resfmt` default.
 *
 * **Unlike Zoho Invoice, which distinguishes "no token" (code 14) from "a
 * dead token" (code 57), Zoho Campaigns answers the SAME code (1007) for
 * both** — confirmed live 2026-09-05 with no `Authorization` header at all
 * and again with a syntactically-plausible garbage token. There is no way to
 * tell "never configured" apart from "revoked/expired" from the response
 * alone.
 */

/** Every documented Campaigns v1.1 endpoint hangs off this path segment. */
export const API_PREFIX = "/api/v1.1";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = REGIONS.find((r) => r.key === "us")!.apiHost;

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s
 * `afterConnect` (one fixed host per region-specific auth method — see
 * `lib/regions.ts` for why there is no single `oauth2` method with a
 * data-centre field). Falls back to the US host only for a Connection that
 * predates `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/** Endpoints that embed the response format as a path segment — see the module doc. */
const PATH_EMBEDS_FORMAT = new Set([
  "listsubscribe",
  "listunsubscribe",
  "contactdonotmail",
  "clonecampaign",
]);

/** Build the request path for a Campaigns endpoint, prefixing `json/` where the vendor requires it. */
export function campaignsPath(endpoint: string): string {
  return PATH_EMBEDS_FORMAT.has(endpoint) ? `json/${endpoint}` : endpoint;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** The query parameter name carrying the response format. Defaults to `resfmt`. */
  formatParam?: "resfmt" | "type";
}

interface ZohoCampaignsErrorBody {
  code?: number | string;
  Code?: number | string;
  message?: string;
  status?: string;
}

/**
 * Turn a Zoho Campaigns error response into one actionable line. Reads both
 * the lowercase (`code`) and capitalized (`Code`) field names — see the
 * module doc for why both appear on the wire.
 */
export function formatCampaignsError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ZohoCampaignsErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoCampaignsErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Campaigns ${status} for ${method} ${path}: ${trimmed}`;
  }
  const code = parsed.code ?? parsed.Code;
  return `Zoho Campaigns ${status}${
    code !== undefined ? ` (code ${code})` : ""
  } for ${method} ${path}: ${parsed.message}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 *
 * Every parameter is sent as a query-string value, never a body — see the
 * module doc. A response is treated as a failure when the transport itself
 * failed (`!res.ok`) OR the vendor's own envelope says `"status":"error"`
 * (some validation failures answer 200 with an error envelope, per the
 * vendor's own error-codes page listing internal codes like 903/2205 beside
 * the HTTP-shaped 400/401/404/500 codes).
 */
export class ZohoCampaignsClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  async request<T = Record<string, unknown>>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const path = campaignsPath(endpoint);
    const url = new URL(`https://${this.host}${API_PREFIX}/${path}`);
    // `type=json` (lowercase) on the two endpoints that use it; `resfmt=JSON`
    // (uppercase, as most of the vendor's own samples show) everywhere else.
    const formatParam = options.formatParam ?? "resfmt";
    url.searchParams.set(formatParam, formatParam === "type" ? "json" : "JSON");
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    });
    const text = await res.text();

    let body: (ZohoCampaignsErrorBody & Record<string, unknown>) | null = null;
    try {
      body = text ? (JSON.parse(text) as ZohoCampaignsErrorBody & Record<string, unknown>) : null;
    } catch { /* fall through — the raw-body branch below reports it */ }

    if (!res.ok || body?.status === "error") {
      throw new Error(
        formatCampaignsError(res.status, options.method ?? "GET", url.pathname, text),
      );
    }
    return (body ?? {}) as T;
  }
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Read a response body that MIGHT nest its payload under a `"response"` key
 * — see the module doc. Falls back to the body itself when it doesn't.
 */
export function unwrapEnvelope<T = Record<string, unknown>>(
  body: Record<string, unknown>,
): T {
  return ((body.response as T | undefined) ?? body) as T;
}

/**
 * Parse a JSON-object `Param` (e.g. `contactInfo`, `campaignInfo`) into the
 * record `JSON.stringify`d onto the `contactinfo`/`campaigninfo` query
 * parameter — see `lib/params.ts#contactInfo` and the module doc's note on
 * every parameter travelling as a query-string value.
 */
export function parseJsonParam(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object of field -> value.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object of field -> value.`);
  }
  return parsed as Record<string, unknown>;
}
