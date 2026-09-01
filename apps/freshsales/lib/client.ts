import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Freshsales (Freshworks CRM, "Freshsales Suite") gives every account its own
 * host — `acme.myfreshworks.com`, with the API under `/crm/sales/api`. Verified
 * against every sample request on developers.freshworks.com/crm/api/ (e.g.
 * `https://domain.myfreshworks.com/crm/sales/api/contacts`). This is a
 * different host shape from the sibling Freshworks apps in this pack —
 * `acme.freshdesk.com` / `acme.freshservice.com` put the API directly on the
 * account subdomain, while Freshsales nests it under a shared
 * `myfreshworks.com` domain with a `/crm/sales/api` path. `*.freshsales.io`
 * (referenced only in one support-article URL on the docs page) is NOT the
 * API host — do not allowlist it.
 *
 * A static manifest cannot enumerate per-account subdomains, so:
 *
 *   - `w6w.network.allow` declares `*.myfreshworks.com`. The runtime's egress
 *     matcher accepts any subdomain of it and still refuses everything else.
 *   - the domain is an Auth field, not an Action param: it identifies the
 *     account, so it belongs to the Connection. `afterConnect` echoes it onto
 *     the connection's redacted `display`, which is where `lib/client.ts`
 *     reads it from — so the client can address the right host without ever
 *     seeing a credential.
 */
export function domainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { domain?: string };
  if (display.domain) return display.domain;
  throw new Error(
    "Freshsales connection has no domain — reconnect the account so it can be recorded.",
  );
}

export function baseUrl(domain: string): string {
  return `https://${domain}.myfreshworks.com/crm/sales/api`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Parse the "Custom field" JSON param into Freshsales's flat
 * `{ field_name: value }` map (the wire key is `custom_field`, singular —
 * unlike Freshdesk/Freshservice's `custom_fields`). Accepts either that map
 * directly, or a JSON string of it.
 */
export function customField(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error('`customField` must be a JSON object, e.g. { "cf_is_active": true }.');
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  return entries.length ? parsed as Record<string, unknown> : undefined;
}

/**
 * Freshsales envelopes every payload under the resource name — `{"contact":
 * {...}}` for a single object, `{"contacts": [...], "meta": {"total": N}}`
 * for a collection — verified against every sample response on
 * developers.freshworks.com/crm/api/. Mirrors the sibling `freshservice` app's
 * `unwrap`/`resource` helper deliberately: same envelope shape, same vendor
 * family, no reason to make 20 actions each repeat `body.contact ?? body`.
 *
 * One quirk worth calling out: a successful delete's body is the bare JSON
 * literal `true`, not an object — verified against the "Delete a Contact"
 * sample. `JSON.parse("true")` handles that fine; no special-casing needed.
 */
export function unwrap<T = unknown>(payload: unknown, key: string): T {
  if (payload && typeof payload === "object" && key in (payload as Record<string, unknown>)) {
    return (payload as Record<string, T>)[key];
  }
  return payload as T;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class FreshsalesClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(domainFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
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
    if (!res.ok) {
      // Freshsales returns { errors: { code, message } } for most failures —
      // verified against the docs' "Error Response" sample. The body is where
      // the actionable part is.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Freshsales ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `request` plus the resource-key unwrap Freshsales applies to every single-object payload. */
  async resource<T = unknown>(
    key: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    return unwrap<T>(await this.request(path, options), key);
  }

  /**
   * `request` plus the plural-key unwrap for a `view` listing, which also
   * carries a `meta.total` alongside the array — verified against the
   * "List All Contacts" sample response.
   */
  async list<T = unknown>(
    key: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<{ items: T[]; total?: number }> {
    const payload = await this.request<Record<string, unknown>>(path, options);
    const items = (payload?.[key] ?? []) as T[];
    const meta = payload?.meta as { total?: number } | undefined;
    return { items, total: meta?.total };
  }
}
