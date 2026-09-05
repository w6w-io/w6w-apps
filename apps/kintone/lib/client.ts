import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Kintone's REST API — verified against kintone.dev 2026-09-05:
 * `docs/kintone/rest-api/overview/kintone-rest-api-overview` (requests/responses/
 * error shape) and `docs/common/authentication` (the four auth methods and
 * exactly which REST APIs each one may call).
 *
 * ## There is no shared API host
 *
 * Kintone is a no-code database/app builder: every customer runs their own
 * tenant at `https://{subdomain}.cybozu.com` or `https://{subdomain}.kintone.com`
 * (confirmed both are live request-URI forms in the vendor docs), with its own
 * Apps, its own fields, and its own data. There is no `api.kintone.com` this
 * app could call. So, exactly like `bubble`, `mautic` and `tableau` in this
 * pack, the tenant's own URL is a connection field and egress is `*`.
 *
 * ## Guest Space Apps use a different URI shape
 *
 * An App created inside a Guest Space is reached at
 * `https://{subdomain}.kintone.com/k/guest/{spaceId}/v1/{path}.json` instead of
 * the general `https://{subdomain}.kintone.com/k/v1/{path}.json` — the segment
 * is inserted between `/k` and `/v1`, nothing else changes. The connection
 * carries an optional Guest Space ID field for this rather than asking for two
 * different URLs.
 *
 * ## The universal error shape
 *
 * The docs state plainly that "If the request fails, a status code other than
 * 200 and an error response will be returned" as `{code, id, message}` JSON —
 * this applies to every `/k/v1/*.json` route, including auth failures, not
 * just malformed bodies. `readErrorMessage` relies on that being true for
 * every action's error path.
 */

/** Public (redacted-safe) connection metadata. */
export interface KintoneConnectionDisplay {
  /** The tenant root, e.g. `https://mycompany.cybozu.com` (no trailing slash, no `/k/...`). */
  baseUrl?: string;
  /** Optional Guest Space ID, when the Apps this connection uses live inside one. */
  guestSpaceId?: string;
}

/**
 * Normalise a user-typed Kintone tenant URL. A missing scheme defaults to
 * `https`; any `/k/v1/...` (or `/k/guest/{id}/v1/...`) suffix someone pasted
 * mid-troubleshooting is stripped back to the bare tenant root, so a pasted
 * `https://acme.cybozu.com/k/v1/record.json` and a bare `acme.cybozu.com`
 * both normalise to `https://acme.cybozu.com`.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Kintone tenant URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Kintone tenant URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Kintone tenant URL has no host: ${trimmed}`);
  let path = url.pathname.replace(/\/+$/, "");
  const kIdx = path.indexOf("/k/");
  if (kIdx >= 0) path = path.slice(0, kIdx);
  else if (path === "/k") path = "";
  return `${url.protocol}//${url.host}${path}`;
}

/**
 * The `/k` (or `/k/guest/{id}`) root a request path is appended to —
 * everything before `/v1/{path}.json`.
 */
export function apiRoot(display: KintoneConnectionDisplay): string {
  if (!display.baseUrl) {
    throw new Error("this Kintone connection records no tenant URL — reconnect it");
  }
  const base = normalizeBaseUrl(display.baseUrl);
  const guestSpaceId = String(display.guestSpaceId ?? "").trim();
  return guestSpaceId ? `${base}/k/guest/${encodeURIComponent(guestSpaceId)}` : `${base}/k`;
}

/** Read the tenant's API root off the redacted Connection. Never touches the credential. */
export function apiRootFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as KintoneConnectionDisplay;
  return apiRoot(display);
}

/** Drop keys the caller left unset, so they are omitted from the query/body rather than sent as null/"". */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
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

/**
 * Kintone's universal error body — documented in the REST API Overview's
 * "Error Response" section as the shape returned for *any* non-200 response.
 */
export interface KintoneErrorBody {
  code?: string;
  id?: string;
  message?: string;
}

/** Extracts a safe-to-display message from a parsed Kintone error body. */
export function safeErrorMessage(body: KintoneErrorBody | null | undefined): string | undefined {
  if (!body || typeof body !== "object" || !body.message) return undefined;
  return body.code ? `${body.code}: ${body.message}` : body.message;
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const parsed = JSON.parse(text) as KintoneErrorBody;
      const message = safeErrorMessage(parsed);
      if (message) return message;
    } catch {
      // Kintone's edge (a subdomain that does not route to a live tenant) answers
      // an HTML "forest_error" page instead of JSON — not this app's documented
      // error shape. Report a short excerpt rather than a wall of markup.
      return text.replace(/\s+/g, " ").trim().slice(0, 200) || res.statusText;
    }
  }
  return res.statusText || `HTTP ${res.status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  /** JSON body. Sent as `application/json`; omit for a bodyless request. */
  json?: unknown;
  /** Response is not JSON — return the raw `Response` instead of parsing it. */
  raw?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`, scoped to one connection's tenant + Guest
 * Space root. Never sets an auth header — the runtime routes every request
 * through the Auth `sign` hook.
 */
export class KintoneClient {
  readonly root: string;

  constructor(private ctx: HookContext) {
    this.root = apiRootFromConnection(ctx.connection);
  }

  /** Build `{root}/v1{path}.json`, with `query` appended as a query string. */
  private url(path: string, query?: RequestOptions["query"]): URL {
    const url = new URL(`${this.root}/v1${path}.json`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        v.forEach((item, i) => url.searchParams.set(`${k}[${i}]`, String(item)));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.url(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.json);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      throw new Error(
        `Kintone ${res.status} for ${init.method} ${url.pathname}: ${await readErrorMessage(res)}`,
      );
    }
    if (options.raw) return res as unknown as T;
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `POST /k/v1/file.json` — `multipart/form-data`, one part named `file`. */
  async uploadFile(fileName: string, content: Blob): Promise<{ fileKey: string }> {
    const url = new URL(`${this.root}/v1/file.json`);
    const form = new FormData();
    form.append("file", content, fileName);
    const res = await this.ctx.fetch(url.toString(), {
      method: "POST",
      headers: { accept: "application/json" },
      body: form,
    });
    if (!res.ok) {
      throw new Error(
        `Kintone ${res.status} for POST ${url.pathname}: ${await readErrorMessage(res)}`,
      );
    }
    return JSON.parse(await res.text()) as { fileKey: string };
  }
}
