import type { HookContext } from "@w6w/types";

/**
 * SendPulse's whole surface — CRM, Bulk Email, Chatbots, Automation 360 — lives
 * on one host, `api.sendpulse.com`, authenticated by one OAuth2
 * client-credentials token (see `auth/client-credentials.ts`). This app covers
 * two of those modules: CRM and Bulk Email.
 *
 * The two modules do NOT share a base path. Bulk Email's OpenAPI document
 * (`https://api.sendpulse.com/.well-known/openapi/bulk-email.yaml`) declares
 * `servers: [{ url: https://api.sendpulse.com }]` — every path is at the host
 * root (`/addressbooks`, `/campaigns`, `/senders`, `/balance`, …). CRM's
 * document (`.../crm.yaml`) declares `servers: [{ url:
 * https://api.sendpulse.com/crm/v1 }]` — every path is under `/crm/v1`
 * (`/deals`, `/contacts`, `/pipelines`, …). Both live on the one host this
 * app allowlists, so nothing extra needs declaring in `network.allow`, but an
 * action wired to the wrong base 404s outright rather than 401ing, which
 * reads as "wrong id" rather than "wrong URL" — confirmed on the wire: an
 * unversioned `GET /users` at the host root is Bulk Email's territory (no
 * such path there), not CRM's `GET /crm/v1/users`.
 */
export const API_HOST = "https://api.sendpulse.com";
export const CRM_BASE = `${API_HOST}/crm/v1`;
export const TOKEN_URL = `${API_HOST}/oauth/access_token`;

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset so a create/update doesn't send nulls SendPulse will reject. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * UTF-8-safe base64 encoding, for `campaign-create`'s `body` field — Bulk
 * Email's `CampaignCreateRequest` schema requires the HTML "encoded in
 * Base64". The global `btoa` only accepts Latin-1 and throws on anything
 * outside it (an em dash, a curly quote, any non-ASCII name), which a real
 * HTML email is likely to contain, so it is routed through `TextEncoder`
 * first rather than called directly on the HTML string.
 */
export function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Pull a human-readable reason out of a SendPulse error body.
 *
 * SendPulse answers errors with THREE different envelopes depending on which
 * layer produced them, all confirmed on the wire (2026-09-06):
 *
 *   - the API gateway itself, for a request that never reaches a handler —
 *     `{"message":"Unauthorized!","error_code":401}` for both a missing and
 *     an invalid bearer token, on BOTH modules;
 *   - Bulk Email's own validation errors — the same flat
 *     `{message, error_code}` shape, per its OpenAPI examples
 *     (`{"message":"Argument bookName missing","error_code":422}`);
 *   - CRM's own not-found responses — nested one level deeper,
 *     `{"data":{"code":…,"message":…}}`, per its OpenAPI `404` example.
 *
 * This reads all three without needing to know which one produced a given
 * response — exactly the ambiguity a caller should not have to resolve
 * per-endpoint.
 */
export function errorMessage(text: string): string | undefined {
  if (!text) return undefined;
  try {
    const body = JSON.parse(text) as {
      message?: string;
      error_description?: string;
      error?: string;
      data?: { message?: string; code?: number };
    };
    return body.message ?? body.data?.message ?? body.error_description ?? body.error;
  } catch {
    return undefined;
  }
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class SendPulseClient {
  constructor(private ctx: HookContext) {}

  private async send<T = unknown>(
    base: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `SendPulse ${res.status} for ${init.method} ${url.pathname}${detail ? `: ${detail}` : ""}`,
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** CRM: `https://api.sendpulse.com/crm/v1/...`. */
  crm<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(CRM_BASE, path, options);
  }

  /** Bulk Email: `https://api.sendpulse.com/...` (host root). */
  bulkEmail<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(API_HOST, path, options);
  }
}
