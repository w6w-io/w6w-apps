import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Wati's WhatsApp chat API — verified 2026-09-05 against the OpenAPI 3.0.4 document
 * (`info.title: "WhatsApp chat API"`, `info.version: "v3"`) embedded in Wati's own
 * ReadMe-hosted reference (`docs.wati.io`, ReadMe project id `5fd7b2fd549312005640ac11`,
 * subdomain `wati-api`) plus the plain-language `authentication` guide page on the same site.
 *
 * ## There is no shared API host
 *
 * Wati's own `authentication` guide states the request shape as
 * `https://live-mt-server.wati.io/<tenantId>/api/v1/getContacts` and its troubleshooting table
 * separately shows `https://live-mt-server-XXXXX.wati.io` as "the API base URL shown in your Wati
 * API documentation" — i.e. the shard prefix (`live-mt-server` vs `live-mt-server-12345`) AND the
 * tenant id path segment both vary per customer. The OpenAPI document itself declares no
 * `servers` entry at all (confirmed by inspecting the embedded schema directly — `servers` is
 * absent, not merely defaulted), which matches: there is nothing to declare. Exactly like
 * `kintone`, `mautic` and `tableau` in this pack, the tenant's own endpoint is a connection field
 * and egress is `*`.
 *
 * ## Two API versions coexist; this app targets V3 only
 *
 * The API reference's own introduction page states plainly: "API V3 (recommended) — Use this for
 * all new integrations. Endpoints use the `/api/ext/v3/...` path" vs "API V1 (legacy) — The older
 * API, still available but not recommended for new projects." This app implements only the V3
 * surface: mixing the two would mean two different base-path conventions and two different error
 * envelopes in one client for no benefit to a new integration.
 *
 * ## Auth field is typed `apiKey` but the wire format is a literal `Bearer` header
 *
 * The OpenAPI document's own security scheme is declared `"type": "apiKey"`, `"in": "header"`,
 * `"name": "Authorization"` — NOT `"type": "http", "scheme": "bearer"` as OpenAPI's own spec
 * would model a bearer token. Its `description` field spells out why: *"Enter 'Bearer' [space]
 * and then your token"* — Wati modelled its own bearer auth as a raw header value rather than
 * the standard HTTP bearer scheme, evidently so their doc site's "Try It" panel takes the literal
 * header text. `auth/api-token.ts` reproduces the real wire format (`Authorization: Bearer
 * <token>`) via `apiKey.prefix`, confirmed against the guide's own cURL example
 * (`--header 'Authorization: Bearer <your_api_token>'`).
 *
 * ## One error envelope for documented 4xx/5xx, but 401 is undocumented and often bodyless
 *
 * Every endpoint's `400`, `403` and `500` responses share one shape — `{code, message,
 * timestamp}` (`InvalidRequestResponse` / `ForbiddenRequestResponse` / `UnexpectedErrorResponse`
 * in the schema, all structurally identical) — but no path in the V3 document declares response
 * content for `401` at all ("The request is unauthorized.", no `content` block), and the generic
 * `errors` reference page confirms it in prose: "401 — No valid API key provided." A missing or
 * bad token in practice may answer 401 with no JSON body whatsoever, so `formatWatiError` degrades
 * to the raw text (or the status text) when the body cannot be parsed as the documented shape,
 * rather than assuming every failure carries `{code, message}`.
 *
 * ## Field-name casing is NOT consistent within the same API version
 *
 * `POST /api/ext/v3/contacts` (create) takes `custom_params` (snake_case), but
 * `PUT /api/ext/v3/contacts` (bulk update) takes a `customParams` field (camelCase) on each item
 * in its `contacts` array — same concept, same API version, two different key spellings. Verified
 * directly against both operations' request schemas (`AddContactRequest.custom_params` vs
 * `UpdateContactRequest.customParams`). `contact-create.ts` and `contacts-update.ts` each send the
 * literal casing their own operation documents; no shared "custom params" builder should paper
 * over the difference, because a shared helper would inevitably pick one spelling and silently
 * break the other endpoint.
 */

/** Wati's documented `{code, message, timestamp}` envelope for 400/403/500. */
export interface WatiErrorBody {
  code?: number;
  message?: string;
  timestamp?: string;
}

export interface WatiConnectionDisplay {
  /** This tenant's own API endpoint, e.g. `https://live-mt-server.wati.io/305xxxxxxxx`. */
  baseUrl?: string;
}

/**
 * Normalise a user-pasted Wati API endpoint. A missing scheme defaults to `https`; any
 * `/api/...` suffix pasted mid-troubleshooting (people copy full sample request URLs, not just
 * the endpoint) is stripped back to the bare tenant root, so both
 * `https://live-mt-server.wati.io/305xxx/api/v1/getContacts` and a bare
 * `live-mt-server.wati.io/305xxx` normalise to `https://live-mt-server.wati.io/305xxx`.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Wati API endpoint is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Wati API endpoint is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Wati API endpoint has no host: ${trimmed}`);
  let path = url.pathname.replace(/\/+$/, "");
  const apiIdx = path.indexOf("/api/");
  if (apiIdx >= 0) path = path.slice(0, apiIdx);
  return `${url.protocol}//${url.host}${path}`;
}

/** Read this connection's own tenant root off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as WatiConnectionDisplay;
  if (!display.baseUrl) {
    throw new Error("this Wati connection records no API endpoint — reconnect it");
  }
  return normalizeBaseUrl(display.baseUrl);
}

/** Drop keys the caller left unset, so they are omitted from the query/body rather than sent as null/"". */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Parse a JSON-typed param, which arrives as either a string or an already-live value. */
export function parseJson(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/** Extracts a safe-to-display message from a parsed Wati error body. */
export function safeErrorMessage(body: WatiErrorBody | null | undefined): string | undefined {
  if (!body || typeof body !== "object" || !body.message) return undefined;
  return body.code !== undefined ? `${body.code}: ${body.message}` : body.message;
}

/**
 * Turn a Wati response into one actionable line. Tries the documented `{code, message}` shape
 * first; falls back to raw text — see the module doc on why 401 cannot be assumed to carry it.
 */
export async function formatWatiError(
  res: Response,
  method: string,
  path: string,
): Promise<string> {
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const parsed = JSON.parse(text) as WatiErrorBody;
      const message = safeErrorMessage(parsed);
      if (message) return `Wati ${res.status} for ${method} ${path}: ${message}`;
    } catch {
      // Not JSON — fall through to the raw text below.
    }
  }
  return `Wati ${res.status} for ${method} ${path}: ${text || res.statusText || "no body"}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  /** JSON body. Sent as `application/json`; omit for a bodyless request. */
  json?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`, scoped to one connection's tenant root. Never sets an auth
 * header — the runtime routes every request through the Auth `sign` hook.
 */
export class WatiClient {
  readonly root: string;

  constructor(private ctx: HookContext) {
    this.root = baseUrlFromConnection(ctx.connection);
  }

  get<T = unknown>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, { method: "GET", query });
  }

  post<T = unknown>(path: string, json?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", json });
  }

  put<T = unknown>(path: string, json?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", json });
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  private url(path: string, query?: RequestOptions["query"]): URL {
    const url = new URL(`${this.root}/api/ext/v3${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.url(path, options.query);
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      throw new Error(await formatWatiError(res, method, url.pathname));
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
