import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Zoho Sheet Data API client.
 *
 * Every endpoint, parameter and response shape here was verified live
 * 2026-09-05 against Zoho's own API Playground
 * (`https://www.zoho.com/sheet/help/api/v2/`) — specifically the JS data file
 * it loads (`zohowebstatic.com/.../js/node/sheet/21165-en.js`), which carries
 * the full operation catalog the page's UI renders from — plus direct
 * unauthenticated probes against every regional API host.
 *
 * ## The API host is `sheet.zoho.<tld>`, NOT `docs.zoho.com`
 *
 * The playground's own static banner text reads `API URL
 * https://docs.zoho.com/sheet/api/v2/<resource_id>` — but that host is dead
 * copy left over from a shared template (Zoho Writer/Docs use `docs.zoho.com`
 * for their own, structurally identical, API). The page's actual JS
 * (`defaultAPIUrl`, and the `getAccessToken` helper building a
 * `dcdomainOne`-suffixed token-manager URL) hardcodes
 * `https://sheet.zoho.com/api/v2/`, and a live probe of that host answers the
 * real, documented error shape while `docs.zoho.com/sheet/api/v2/...`
 * (checked live) does not serve this API at all. Trusting the banner text
 * over the code that actually drives the page's own "Sample Request" panel
 * would have pointed every request at the wrong host.
 *
 * ## Almost every call needs a `resource_id` (the workbook id) in the URL PATH
 *
 * Two operations address a fixed path instead — `workbook.list` at
 * `/api/v2/workbooks` and `workbook.create` at `/api/v2/create` — because they
 * don't operate on an existing workbook. Every other documented operation
 * (worksheet and content/range operations) addresses
 * `/api/v2/<resource_id>`, with `resource_id` being the workbook's id (as
 * returned by `workbook.list`/`workbook.create`, or embedded in a workbook's
 * `workbook_url`) and the actual operation named by a `method` body
 * parameter (`worksheet.list`, `range.content.get`, ...) — a JSON-RPC-over-
 * POST shape, not a per-operation REST path. This client's {@link call} takes
 * that path segment explicitly so each action stays honest about which case
 * it's in.
 *
 * ## Every call is a POST with `application/x-www-form-urlencoded` params
 *
 * Confirmed from the playground's own generated curl sample
 * (`curl '<url>' -H 'Authorization: Zoho-oauthtoken $oauthtoken' -d
 * 'method=...&...' -X POST`) — including read operations like `workbook.list`
 * and `range.content.get`. A JSON- or array-typed parameter (`json_data`,
 * `criteria_json`, ...) is `JSON.stringify`-ed and sent as that one form
 * field's value, not as the request body itself.
 *
 * ## The error envelope is flat, and distinct from the success envelope
 *
 * A success answers `{"status": "success", "method": "...", ...}`. A failure
 * answers `{"error_message": "...", "error_code": <number>}` with a non-2xx
 * HTTP status and NO `status` field at all — confirmed live for `error_code`
 * `2401` (missing/invalid token; the message text differs between "no
 * Authorization header" and "garbage token", but the code is identical, so
 * `auth/oauth2.ts`'s `test` hook classifies by the documented code rather
 * than by message text or HTTP status alone).
 */

/** The Sheet Data API path every documented operation hangs off. */
export const API_PREFIX = "/api/v2";

/** The default (United States) API host, used only where no connection/region is known yet. */
export const DEFAULT_API_HOST = "sheet.zoho.com";

/**
 * The API host for this connection, as recorded by `auth/oauth2.ts`'s
 * `afterConnect` (one fixed host per region-specific auth method — see
 * `lib/regions.ts`). Falls back to the US host only for a Connection that
 * predates `afterConnect` recording it, which should not happen in practice.
 */
export function apiHostFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { apiHost?: string };
  return display.apiHost || DEFAULT_API_HOST;
}

/** JSON-object/array valued params are stringified; everything else goes through as-is. */
export type RequestParams = Record<string, unknown>;

interface ZohoSheetErrorBody {
  error_code?: number;
  error_message?: string;
}

/**
 * Turn a Zoho Sheet error response into one actionable line. `error_code` is
 * the stable machine token Zoho documents per error family (`2401` = no/bad
 * token, `2862` = no such workbook, `2863` = no such worksheet, ...);
 * `error_message` is always present and human-readable.
 */
export function formatSheetError(status: number, method: string, raw: string): string {
  let parsed: ZohoSheetErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoSheetErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.error_message) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Sheet ${status} for ${method}: ${trimmed}`;
  }
  return `Zoho Sheet ${status}${
    parsed.error_code ? ` (error_code ${parsed.error_code})` : ""
  } for ${method}: ${parsed.error_message}`;
}

/** The envelope every successful Zoho Sheet Data API response shares. */
export interface SheetEnvelope {
  status: "success";
  method: string;
  [key: string]: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoSheetClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  /**
   * @param pathSegment Either a fixed segment (`"workbooks"`, `"create"`) or
   *   a workbook `resource_id` — see the class doc's "Almost every call
   *   needs a `resource_id`" section for which is which.
   * @param method The Zoho Sheet `method` body parameter, e.g. `"worksheet.list"`.
   * @param params Every other documented parameter for that method.
   */
  async call<T extends SheetEnvelope = SheetEnvelope>(
    pathSegment: string,
    method: string,
    params: RequestParams = {},
  ): Promise<T> {
    const url = `https://${this.host}${API_PREFIX}/${pathSegment}`;
    const body = new URLSearchParams();
    body.set("method", method);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      body.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }

    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatSheetError(res.status, method, text));
    }
    return (text ? JSON.parse(text) : { status: "success", method }) as T;
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
