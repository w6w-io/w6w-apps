import type { HookContext, RedactedConnection } from "@w6w/types";
import { REGIONS } from "./regions.ts";

/**
 * Zoho Bookings v1 REST API client.
 *
 * Every path, verb, query/form parameter and response shape here was
 * verified against Zoho's own documentation, fetched via the Wayback Machine
 * on 2026-09-05 (`www.zoho.com` answers a bare `403` to this container's
 * direct requests, so the archived copies of
 * `https://www.zoho.com/bookings/help/api/v1/*.html` — generate-accesstoken,
 * oauthauthentication, domain-specificapiurls, fetch-workspaces,
 * fetch-services, fetch-staff, fetch-availability, book-appointment,
 * get-appointment, update-appointment, reschedule-appointment, add-staff —
 * were used instead), and against live probes of the real API hosts run
 * directly from this container. Nothing here came from a third-party
 * integration directory.
 *
 * ## The base path is `/bookings/v1/json/<action>` — a JSON-RPC-style
 * ## surface, not Zoho Books'/Desk's resource-per-path REST shape
 *
 * Every documented endpoint hangs a verb-shaped segment off one fixed
 * prefix (`/bookings/v1/json/services`, `/bookings/v1/json/getappointment`,
 * `/bookings/v1/json/updateappointment`, ...) rather than a
 * `/{resource}/{id}` shape. There is no `/organizations`-style discovery
 * call this app can rely on for regional confirmation — `afterConnect`
 * confirms the region by calling `/workspaces` instead (see `auth/oauth2.ts`).
 *
 * ## Write endpoints take `multipart/form-data`, not a JSON body — despite
 * ## the API otherwise being JSON in and JSON out
 *
 * Book/Update/Reschedule Appointment and Add Staff are all documented with a
 * `curl --form` sample request (multipart form fields, several of them
 * themselves JSON-encoded strings — e.g. `customer_details`,
 * `additional_fields`, `payment_info`, and Add Staff's whole payload under a
 * single `staffMap` field). `request()` below takes a `FormData` body for
 * these, mirroring this pack's `zohodesk` attachment-upload action (the
 * established multipart pattern for this codebase) rather than the
 * JSON-body convention `zohobooks`/`zoho` (CRM) use for their own
 * create/update calls.
 *
 * ## The success envelope is `{"response": {"returnvalue": ..., "status":
 * ## "success", "logMessage": [...]}}` — EXCEPT Add Staff, which answers a
 * ## bare `{"response": [...]}` array with no `returnvalue`/`status` wrapper
 * ## at all
 *
 * `unwrapReturnValue` handles the common shape; Add Staff's per-item result
 * (`{"id", "name", "email", "status"}`, where `status` is `"success"` or an
 * error description such as `"Staff already exists"`) is unwrapped
 * separately by `unwrapStaffAddResult` — the same "a 2xx response can still
 * carry a per-item failure" shape this pack's `zoho` (CRM) app documents for
 * its own batch-style endpoints.
 *
 * ## An auth failure answers a generic Zoho Creator/gateway HTML page, NOT
 * ## the documented JSON envelope — HTTP status is the only usable signal
 *
 * Live-probed 2026-09-05 against `https://www.zohoapis.com/bookings/v1/json/workspaces`:
 * a request with no `Authorization` header at all answers `400`, and one
 * with a syntactically-plausible but dead token answers `401` — both with
 * `content-type: text/html`, a ~1.6 KB page titled "Zoho Creator - Error
 * Page" ("Something went wrong... contact support@zohobookings.com"),
 * identical between the two cases apart from the status code. This is
 * unlike `zohobooks`/`zohodesk`/`zoho` (CRM), which all answer a structured
 * JSON body (`{"code": ...}` / `{"errorCode": ...}`) that names the specific
 * failure even on an unauthenticated call. Because Zoho Bookings gives no
 * body to classify from here, `auth/oauth2.ts`'s `test` hook necessarily
 * falls back to the HTTP status itself (400 = no usable token reached the
 * request, 401 = a token reached it and was rejected) — the one deliberate
 * exception in this app to "classify from the body, not the status code,"
 * because the vendor exposes nothing else to read.
 */

/** Every documented Bookings endpoint hangs off this path segment. */
export const API_PREFIX = "/bookings/v1/json";

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
 * The workspace this call should act against. Only `service-list` truly
 * requires one (Fetch Services 400s without `workspace_id`) — everything
 * else that takes a workspace id treats it as an optional narrowing filter.
 * Falls back to the id `afterConnect` records on the connection (its first
 * workspace, best-effort), so the common single-workspace account needs
 * nothing typed in. Run `workspace-list` to see every id available.
 */
export function workspaceIdFrom(
  input: { workspaceId?: string | number },
  ctx: HookContext,
): string {
  const fromInput = input.workspaceId;
  if (fromInput !== undefined && fromInput !== null && String(fromInput).trim() !== "") {
    return String(fromInput).trim();
  }
  const display = (ctx.connection?.display ?? {}) as { workspaceId?: string };
  if (display.workspaceId) return display.workspaceId;
  throw new Error(
    "No `workspaceId` was provided and none is recorded on this connection. Run List " +
      "Workspaces and pass one explicitly.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Set for a write call — every documented POST endpoint expects `multipart/form-data`. */
  form?: FormData;
}

/**
 * Turn a non-2xx response into one actionable line. A JSON body (the
 * documented `{"response": {...}}` envelope, when Zoho Bookings actually
 * sends it) is preferred; otherwise — most commonly the generic HTML gateway
 * page described in the module docs above — the raw body is reported,
 * truncated, with its content-type so a caller can tell the two cases apart.
 */
export function formatBookingsError(
  status: number,
  method: string,
  path: string,
  contentType: string,
  raw: string,
): string {
  if (contentType.includes("json")) {
    try {
      const parsed = JSON.parse(raw) as {
        response?: { status?: string; logMessage?: string[] };
      };
      const envelopeStatus = parsed?.response?.status;
      const logMessage = parsed?.response?.logMessage;
      if (envelopeStatus || logMessage?.length) {
        return `Zoho Bookings ${status} for ${method} ${path}: status="${
          envelopeStatus ?? "unknown"
        }"${logMessage?.length ? ` (${logMessage.join("; ")})` : ""}`;
      }
    } catch { /* not the envelope shape — fall through to the raw body */ }
  }
  const trimmed = raw.length > 300
    ? `${raw.slice(0, 300)}… (${raw.length} bytes, content-type ${contentType || "unknown"})`
    : raw || "(empty body)";
  return `Zoho Bookings ${status} for ${method} ${path}: ${trimmed}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets `Authorization` — the runtime
 * routes every request through the auth `sign` hook, which stamps
 * `Zoho-oauthtoken`.
 */
export class ZohoBookingsClient {
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
    if (options.form !== undefined) init.body = options.form;

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok) {
      throw new Error(
        formatBookingsError(res.status, init.method ?? "GET", url.pathname, contentType, text),
      );
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Zoho Bookings ${res.status} for ${init.method ?? "GET"} ${url.pathname} returned ` +
          `non-JSON content (content-type ${contentType || "unknown"})`,
      );
    }
  }
}

/** The envelope every documented Bookings endpoint shares — except Add Staff, see below. */
export interface BookingsEnvelope<T = unknown> {
  response: {
    returnvalue?: T;
    status?: string;
    logMessage?: string[];
  };
}

/**
 * Pull `returnvalue` out of the standard envelope, throwing if the vendor's
 * own `status` field is not `"success"` (or is missing entirely — a shape
 * this app has never observed on a 2xx but does not assume away).
 */
export function unwrapReturnValue<T>(
  body: BookingsEnvelope<T>,
  method: string,
  path: string,
): T {
  const status = body?.response?.status;
  if (status !== "success") {
    const messages = body?.response?.logMessage;
    throw new Error(
      `Zoho Bookings ${method} ${path} returned status "${status ?? "unknown"}"${
        messages?.length ? ` (${messages.join("; ")})` : ""
      }`,
    );
  }
  const rv = body?.response?.returnvalue;
  if (rv === undefined) {
    throw new Error(`Zoho Bookings ${method} ${path} carried no "returnvalue"`);
  }
  return rv;
}

/** Add Staff's per-item result — see module docs for why its envelope has no `returnvalue`/`status`. */
export interface StaffAddResult {
  id?: string;
  name?: string;
  email?: string;
  /** `"success"`, or an error description such as `"Staff already exists"`. */
  status: string;
}

export function unwrapStaffAddResult(
  body: { response?: StaffAddResult[] },
  method: string,
  path: string,
): StaffAddResult {
  const first = body?.response?.[0];
  if (!first) {
    throw new Error(`Zoho Bookings ${method} ${path} carried no result`);
  }
  if (first.status !== "success") {
    throw new Error(`Zoho Bookings ${method} ${path}: ${first.status}`);
  }
  return first;
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
