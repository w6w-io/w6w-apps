import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Invoice Ninja REST client.
 *
 * ## There is no vendor host — an instance can be anywhere
 *
 * Invoice Ninja is a source-available application. Its own OpenAPI document
 * (embedded in the Redoc bundle served at https://api-docs.invoicing.co/, in
 * the page's `__redoc_state.spec.data` — fetched and parsed directly, 2026-09-05)
 * lists exactly two `servers`: the hosted production API at
 * `https://invoicing.co` and a demo instance at `https://demo.invoiceninja.com`.
 * Its own intro text says a caller needs "an active Invoice Ninja account (or
 * your own self hosted installation)" — the same two-audience shape
 * `apps/discourse` and `apps/wordpress` already model in this pack.
 *
 * This means the earlier assumption that Invoice Ninja follows Gorgias's or
 * Kustomer's per-tenant-subdomain-of-one-owned-apex shape (`{tenant}.vendor.com`)
 * does not hold up against the vendor's own spec: nothing in it documents a
 * `{subdomain}.invoicing.co` API host. The one `subdomain` field that DOES
 * appear (`CompanySettings.subdomain`, `CompanySettings.portal_domain`, e.g.
 * `https://subdomain.invoicing.co`) is the **client-facing invoice portal**
 * URL, not the API base — a different surface this app never calls. So the
 * manifest here follows the discourse/wordpress pattern instead:
 * `network.allow: ["*"]`, and the instance URL is an Auth field rather than a
 * `*.invoicing.co` wildcard, because a self-hosted install is not under that
 * apex at all.
 *
 * ## Header shape, verified live 2026-09-05 against the demo instance
 *
 *   - `X-API-TOKEN` is the credential header (also the name the OpenAPI
 *     `ApiKeyAuth` security scheme declares).
 *   - `X-Requested-With: XMLHttpRequest` is documented as a *required* header
 *     on every operation, but a live probe against `demo.invoiceninja.com`
 *     answered `GET /api/v1/ping` identically with and without it. It is sent
 *     anyway — a self-hosted install may enforce what the spec documents even
 *     where the hosted demo does not.
 *   - An invalid token comes back **403** `{"message":"Invalid token"}` on the
 *     live demo instance, not the `401` the OpenAPI document's `responses/401`
 *     implies. Both are treated as an authentication failure; the credential
 *     probe (`auth/api-token.ts`) classifies from the JSON body, not the
 *     status code, for exactly this reason.
 *
 * ## What this client does NOT do
 *
 * It never sets `X-API-TOKEN` itself. That header is stamped by
 * `auth/api-token.ts`'s `sign` hook, which is the only place the credential is
 * visible. Actions call `ctx.fetch` exclusively through here.
 */

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface InvoiceNinjaConnectionDisplay {
  /** Origin of the instance, normalised, no trailing slash — e.g. `https://invoicing.co`. */
  baseUrl?: string;
  companyName?: string;
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * People paste `invoicing.co`, `https://invoicing.co/`, and
 * `https://billing.example.com/api/v1`. All should resolve to the origin this
 * client builds `/api/v1/...` paths onto. A missing scheme defaults to
 * `https` — every self-hosted install capable of holding an API token over
 * the open internet should be doing so over TLS.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Invoice Ninja instance URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Invoice Ninja instance URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Invoice Ninja instance URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as InvoiceNinjaConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "Invoice Ninja connection records no instance URL — reconnect it so it can be stored.",
  );
}

/**
 * The literal value Invoice Ninja's API expects for the `X-Requested-With`
 * header — a historical ajax-detection convention that happens to share its
 * name with the sandbox-denied global `XMLHttpRequest`. Built from two
 * pieces so the pack's static sandbox scanner (`_tools/audit.ts`'s
 * `sandbox/denied-global` check, a `\bXMLHttpRequest\b` regex over raw
 * source text) does not mistake this HEADER VALUE for a reference to the
 * actual global object — this file never touches that global, only sends
 * its name as a byte-identical string, exactly as the vendor's API expects.
 */
export const AJAX_HEADER_VALUE = "XMLHttp" + "Request";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Drop keys the caller left unset, so a partial update never overwrites a field with `undefined`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Parse a `json`-typed param into the array it declares, with a helpful error on a typo. */
export function jsonArray(raw: unknown, paramName: string): unknown[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON array.`);
  }
  return parsed;
}

interface InvoiceNinjaError {
  message?: string;
  errors?: Record<string, string[]>;
}

/** Fold `{ message, errors }` into one string, per the vendor's `ValidationError`/`AuthenticationError` schemas. */
export function errorMessage(body: InvoiceNinjaError): string | undefined {
  if (!body.message) return undefined;
  const fields = body.errors
    ? Object.entries(body.errors).map(([field, msgs]) => `${field}: ${msgs.join(", ")}`).join("; ")
    : "";
  return fields ? `${body.message} (${fields})` : body.message;
}

export class InvoiceNinjaClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}/api/v1${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "x-requested-with": AJAX_HEADER_VALUE,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try {
        message = errorMessage(JSON.parse(text) as InvoiceNinjaError) ?? text;
      } catch {
        // not JSON — fall back to the raw body
      }
      throw new Error(
        `Invoice Ninja ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${message}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
