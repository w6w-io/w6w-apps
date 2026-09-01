import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Invoice REST API client.
 *
 * Every path, header, body field and response shape here was verified on
 * 2026-09-01 against Zoho's own documentation
 * (`https://www.zoho.com/invoice/api/v3/introduction/` and the per-resource
 * pages it links to — organizations, contacts, items, invoices, estimates)
 * and live probes against all eight regional API hosts (see
 * `lib/regions.ts`).
 *
 * ## `organization_id` is required on almost every call — and it travels as a HEADER, not a query param
 *
 * Like Zoho Books, Zoho Invoice calls a business an "organization" and
 * requires the organization id on every endpoint except `GET /organizations`
 * itself (the discovery call). **Unlike Zoho Books**, every one of Zoho
 * Invoice's own generated per-endpoint request examples (contacts, items,
 * invoices, estimates — checked across all four resource pages, 644 hits
 * total for the header name across those four pages alone) sends it as the
 * header `X-com-zoho-invoice-organizationid`, never as an `organization_id`
 * query parameter. The introduction page's prose agrees ("The Organization
 * ID and the Access token has to be sent as Header in the API") even though
 * two of its own generic illustrative snippets (on the `errors` and
 * `pagination` pages) show the older `?organization_id=` query-param form —
 * those two pages are shared boilerplate reused across several Zoho API
 * docs, not the Invoice-specific generated examples. `organizationIdFrom`
 * below mirrors `zohobooks`'s helper of the same name in shape (optional
 * per-action param, falling back to the id `afterConnect` records on the
 * connection), but {@link ZohoInvoiceClient.request} stamps it as a header
 * rather than appending it to the query string.
 *
 * ## The response envelope names its own resource key, and it is not `data`
 *
 * A success is `{"code": 0, "message": "success", "<resource>": ...}` —
 * `code` is `0` for success and non-zero for an error, and the actual
 * payload lives under a resource-specific key (`"contacts"`, `"item"`,
 * `"invoices"`, ...), the same shape `zohobooks` documents for its own
 * `unwrapResource`.
 *
 * ## The error shape is flat, like Books' — but with no `status` field
 *
 * `GET /organizations` with no Authorization header answers `401
 * {"code":14,"message":"The request could not be authenticated as the
 * authentication value you entered is invalid. Enter a valid authentication
 * value and try again."}` (confirmed live); the same call with a
 * syntactically-plausible but dead token answers `401 {"code":57,"message":
 * "You are not authorized to perform this operation"}` (also confirmed
 * live). Two different `code` values worth telling apart in `auth/oauth2.ts`'s
 * `test` hook.
 */

/** Every documented Invoice endpoint hangs off this path segment. */
export const API_PREFIX = "/invoice/v3";

/** The header Zoho Invoice's own generated examples use to carry the organization id. */
export const ORG_ID_HEADER = "X-com-zoho-invoice-organizationid";

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

/**
 * The Zoho Invoice organization this call should act on.
 *
 * Every documented endpoint except `GET /organizations` requires the
 * organization id (as the `X-com-zoho-invoice-organizationid` header — see
 * the module doc). Rather than force it as a required param on every single
 * Action, it is optional and falls back to the id `afterConnect` records on
 * the Connection (see `auth/oauth2.ts`) — the common single-organization
 * case needs nothing typed in. `organization-list` surfaces every id
 * available when a caller genuinely has more than one.
 */
export function organizationIdFrom(
  input: { organizationId?: string | number },
  ctx: HookContext,
): string {
  const fromInput = input.organizationId;
  if (fromInput !== undefined && fromInput !== null && String(fromInput).trim() !== "") {
    return String(fromInput).trim();
  }
  const display = (ctx.connection?.display ?? {}) as { organizationId?: string };
  if (display.organizationId) return display.organizationId;
  throw new Error(
    "No `organizationId` was provided and none is recorded on this connection. Run List " +
      "Organizations and pass one explicitly.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** The organization id to stamp as the `X-com-zoho-invoice-organizationid` header. Omit for `GET /organizations`. */
  organizationId?: string;
  body?: unknown;
}

interface ZohoInvoiceErrorBody {
  code?: number;
  message?: string;
}

/**
 * Turn a Zoho Invoice error response into one actionable line. `code` is the
 * stable machine token Zoho documents per error family (`14` = no usable
 * auth header, `57` = dead token, `1002` = "Invoice does not exist"/"Contact
 * does not exist" depending on resource, ...); `message` is always present
 * and human-readable.
 */
export function formatInvoiceError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ZohoInvoiceErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoInvoiceErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Invoice ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Invoice ${status}${
    parsed.code ? ` (code ${parsed.code})` : ""
  } for ${method} ${path}: ${parsed.message}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoInvoiceClient {
  private host: string;

  constructor(private ctx: HookContext) {
    this.host = apiHostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`https://${this.host}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.organizationId) headers[ORG_ID_HEADER] = options.organizationId;
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatInvoiceError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** Zoho Invoice's `page_context` node, carried on every list response. */
export interface PageContext {
  page?: number;
  per_page?: number;
  has_more_page?: boolean;
  sort_column?: string;
  sort_order?: string;
}

/** The envelope every Zoho Invoice response shares, before its resource key is known. */
export interface InvoiceEnvelope {
  code: number;
  message: string;
  page_context?: PageContext;
  [resourceKey: string]: unknown;
}

/**
 * Pull the resource payload out of an Invoice envelope by its
 * (endpoint-specific) key — `"contacts"` for a list, `"contact"` for a get,
 * etc. Throws if the key is absent, since every documented success response
 * carries it.
 */
export function unwrapResource<T>(body: InvoiceEnvelope, resourceKey: string): T {
  const value = body[resourceKey];
  if (value === undefined) {
    throw new Error(
      `Zoho Invoice response carried no "${resourceKey}" key (message: ${body.message})`,
    );
  }
  return value as T;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Parse a "Fields" JSON param into the record body Zoho Invoice expects. */
export function parseFields(raw: unknown, paramName = "fields"): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") {
    throw new Error(`\`${paramName}\` is required and must be a JSON object of field -> value.`);
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object of field -> value.`);
  }
  return parsed as Record<string, unknown>;
}
