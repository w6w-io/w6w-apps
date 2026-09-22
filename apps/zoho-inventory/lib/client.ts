import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Inventory REST API client.
 *
 * Every path, query parameter, body field and response shape here was
 * verified on 2026-09-22 against Zoho's own documentation
 * (`https://www.zoho.com/inventory/api/v1/introduction/` and the
 * per-resource pages it links to — organizations, contacts, items, locations,
 * salesorders, oauth, errors, pagination) and live probes against all eight
 * regional API hosts (see `lib/regions.ts`).
 *
 * ## `organization_id` is required on almost every call — this is NOT optional
 *
 * Zoho Inventory, like Zoho Books, calls a business an "organization" and
 * requires `organization_id` as a query parameter on every endpoint EXCEPT
 * `GET /organizations` itself (the discovery call) — the vendor's own cURL
 * example is `POST https://www.zohoapis.com/inventory/v1/contacts?organization_id=10234695`.
 * Getting this wrong doesn't 401 — it answers an Inventory-specific `400`
 * asking for the parameter, which reads like a broken action rather than a
 * missing setting. `organizationIdFrom` below mirrors `zohobooks`'s
 * same-named helper (itself modelled on `zohomail`'s `accountIdFrom`):
 * optional per-action param, falling back to the id `afterConnect` records on
 * the connection (see `auth/oauth2.ts`), so the common single-organization
 * case needs nothing typed in.
 *
 * ## The response envelope names its own resource key, and it is NOT `data`
 *
 * A successful response is `{"code": 0, "message": "success", "<resource>":
 * ...}` — `code` is `0` for success and non-zero for an error, and the actual
 * payload lives under a resource-specific key (`"contacts"`, `"items"`,
 * `"locations"`, `"salesorders"` for a list — singular `"contact"`, `"item"`,
 * `"salesorder"`, `"organization"` for a single record). List responses also
 * carry the vendor's `page_context` node:
 * `GET /contacts?page=2&per_page=25` answers
 * `{"code":0,"message":"success","contacts":[...],"page_context":{"page":2,
 * "per_page":25,"has_more_page":false}}` (confirmed live in Zoho's own
 * pagination example). {@link unwrapResource} therefore takes the key as a
 * parameter rather than assuming one name.
 *
 * ## The error shape is flat, with no `status` field
 *
 * `GET /organizations` with no Authorization header answers `401
 * {"code":14,"message":"The request could not be authenticated as the
 * authentication value you entered is invalid. Enter a valid authentication
 * value and try again."}` (confirmed live 2026-09-22 against
 * `https://www.zohoapis.com/inventory/v1/organizations`); the same call with
 * a syntactically-plausible but dead token answers `401 {"code":57,"message":
 * "You are not authorized to perform this operation"}`. Two different `code`
 * values worth telling apart in `auth/oauth2.ts`'s `test` hook.
 */

/** Every documented Inventory endpoint hangs off this path segment. */
export const API_PREFIX = "/inventory/v1";

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
 * The Zoho Inventory organization this call should act on.
 *
 * Every documented endpoint except `GET /organizations` requires
 * `organization_id` as a query parameter. Rather than force it as a required
 * param on every single Action, it is optional and falls back to the id
 * `afterConnect` records on the Connection (see `auth/oauth2.ts`) — the
 * common single-organization case needs nothing typed in. `organization-list`
 * surfaces every id available when a caller genuinely has more than one.
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
  body?: unknown;
}

interface ZohoInventoryErrorBody {
  code?: number;
  message?: string;
}

/**
 * Turn a Zoho Inventory error response into one actionable line. `code` is
 * the stable machine token Zoho documents per error family (`14` = no usable
 * auth header, `57` = dead token, `1002` = "Invoice does not exist", ...);
 * `message` is always present and human-readable.
 */
export function formatInventoryError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ZohoInventoryErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoInventoryErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Inventory ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Inventory ${status}${
    parsed.code ? ` (code ${parsed.code})` : ""
  } for ${method} ${path}: ${parsed.message}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoInventoryClient {
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
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatInventoryError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** Zoho Inventory's `page_context` node, carried on every list response. */
export interface PageContext {
  page?: number;
  per_page?: number;
  has_more_page?: boolean;
  sort_column?: string;
  sort_order?: string;
}

/** The envelope every Zoho Inventory response shares, before its resource key is known. */
export interface InventoryEnvelope {
  code: number;
  message: string;
  page_context?: PageContext;
  [resourceKey: string]: unknown;
}

/**
 * Pull the resource payload out of an Inventory envelope by its
 * (endpoint-specific) key — `"contacts"` for a list, `"contact"` for a get,
 * etc. Throws if the key is absent, since every documented success response
 * carries it.
 */
export function unwrapResource<T>(body: InventoryEnvelope, resourceKey: string): T {
  const value = body[resourceKey];
  if (value === undefined) {
    throw new Error(
      `Zoho Inventory response carried no "${resourceKey}" key (message: ${body.message})`,
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

/** Parse a "Fields" JSON param into the record body Zoho Inventory expects. */
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
