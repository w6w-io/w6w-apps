import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Desk REST API client.
 *
 * Every path, header, query parameter, body field and response shape here was
 * verified on 2026-08-25 against Zoho's own documentation
 * (`https://desk.zoho.com/DeskAPIDocument#Introduction`, a single-page
 * reference covering Tickets, Contacts, Accounts, Agents, Departments,
 * Threads, Comments, Attachments, Search and OAuth) and live probes against
 * all ten regional API hosts (see `lib/regions.ts`).
 *
 * ## `orgId` is a mandatory HEADER on almost every call — not a query param
 *
 * Unlike Zoho Books (`organization_id` as a query parameter) or Zoho CRM (one
 * implicit org per token), Zoho Desk's docs state plainly: "All Zoho Desk APIs
 * require these two mandatory fields in the header" — `Authorization` and
 * `orgId` — and "All API endpoints except `/organizations` mandatorily
 * require the orgId." Sending it as a query parameter instead does not work;
 * it must be the literal HTTP header `orgId: <id>`. `orgIdFrom` below mirrors
 * `zohobooks`'s `organizationIdFrom`: an optional per-action param, falling
 * back to the id `afterConnect` records on the connection, so the common
 * single-organization case needs nothing typed in.
 *
 * ## The response envelope is uniform: `{"data": [...]}` for a list, the bare
 * ## object for a Get — unlike Zoho Books' resource-keyed envelope
 *
 * A List response is always `{"data": [...]}`; a Get response is the record
 * itself with no wrapper at all. This is simpler than Zoho Books (whose
 * envelope names a resource-specific key even for a single Get) and closer to
 * Zoho CRM's list shape, but do not assume a `data` key on a Get — there is
 * none.
 *
 * ## The error shape is `{"errorCode": "<TOKEN>", "message": "..."}` —
 * ## a STRING code, not Zoho Books' numeric `code`
 *
 * `GET /organizations` with no `Authorization` header answers `401
 * {"errorCode":"UNAUTHORIZED","message":"You are not authenticated to perform
 * this operation."}` (confirmed live); the same call with a
 * syntactically-plausible but fake token answers `401
 * {"errorCode":"INVALID_OAUTH","message":"The OAuth Token you provided is
 * invalid."}`. Two different problems worth telling apart in `auth/oauth2.ts`'s
 * `test` hook. A third, `OAUTH_ORG_MISMATCH` ("The OAuthToken is not valid for
 * specified organization"), fires when the `orgId` header names an
 * organization the token was never authorized against — a wrong-but-plausible
 * id, not a missing one, and its message gives no hint that `orgId` is the
 * field at fault.
 */

/** Every documented Desk endpoint hangs off this path segment. */
export const API_PREFIX = "/api/v1";

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
 * The Zoho Desk organization this call should act against, sent as the
 * mandatory `orgId` HEADER (not a query parameter — see module docs above).
 * Every documented endpoint except `GET /organizations` requires it. Optional
 * per-action param, falling back to the id `afterConnect` records on the
 * Connection (see `auth/oauth2.ts`) — the common single-organization case
 * needs nothing typed in. `organization-list` surfaces every id available
 * when a caller genuinely belongs to more than one.
 */
export function orgIdFrom(
  input: { orgId?: string | number },
  ctx: HookContext,
): string {
  const fromInput = input.orgId;
  if (fromInput !== undefined && fromInput !== null && String(fromInput).trim() !== "") {
    return String(fromInput).trim();
  }
  const display = (ctx.connection?.display ?? {}) as { orgId?: string };
  if (display.orgId) return display.orgId;
  throw new Error(
    "No `orgId` was provided and none is recorded on this connection. Run List Organizations " +
      "and pass one explicitly.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Set instead of `body` for a multipart upload (e.g. ticket attachments). */
  form?: FormData;
  /**
   * The mandatory `orgId` header value — resolved by the caller (via
   * `orgIdFrom`) since it may come from the action's input or the
   * connection's recorded default. Omit only for `GET /organizations`
   * itself, the one endpoint the docs state does not require it.
   */
  orgId?: string;
}

interface ZohoDeskErrorBody {
  errorCode?: string;
  message?: string;
}

/**
 * Turn a Zoho Desk error response into one actionable line. `errorCode` is
 * the stable machine token Zoho documents (`UNAUTHORIZED`, `INVALID_OAUTH`,
 * `SCOPE_MISMATCH`, `OAUTH_ORG_MISMATCH`, `INVALID_DATA`,
 * `RESOURCE_SIZE_EXCEEDED`, ...) — a string, unlike Zoho Books' numeric
 * `code`. `message` is always present and human-readable.
 */
export function formatDeskError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: ZohoDeskErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ZohoDeskErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    const trimmed = raw.length > 600
      ? `${raw.slice(0, 600)}… (${raw.length} bytes truncated)`
      : raw;
    return `Zoho Desk ${status} for ${method} ${path}: ${trimmed}`;
  }
  return `Zoho Desk ${status}${
    parsed.errorCode ? ` (${parsed.errorCode})` : ""
  } for ${method} ${path}: ${parsed.message}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`. Stamps the mandatory `orgId` header itself, since it is
 * a request-shape concern every action shares (unlike the credential, it is
 * not secret and does not belong in `sign`).
 */
export class ZohoDeskClient {
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
    if (options.orgId) headers["orgId"] = options.orgId;

    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form !== undefined) {
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatDeskError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** The envelope every Zoho Desk LIST response shares — a Get returns the bare record instead. */
export interface DeskListEnvelope<T> {
  data: T[];
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Parse a "Fields" JSON param into the record body Zoho Desk expects. */
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

/**
 * Decode a base64 string param into an `ArrayBuffer` suitable for wrapping in
 * a `Blob` for a multipart file upload (with or without a `data:` prefix).
 */
export function base64ToBytes(base64: string): ArrayBuffer {
  const cleaned = base64.includes(",") ? base64.split(",", 2)[1] : base64;
  const bin = atob(cleaned);
  const buffer = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buffer;
}
