import type { HookContext } from "@w6w/types";

/**
 * eBay's REST APIs — Buy, Sell, Commerce, Developer — all live on this one
 * production host under different path prefixes (`/buy/browse/v1/...`,
 * `/developer/analytics/v1_beta/...`). `developer.ebay.com` is the docs
 * host only; nothing in this app calls it.
 */
export const API_BASE = "https://api.ebay.com";

/** The OAuth2 client-credentials token endpoint, on the same host as the API. */
export const TOKEN_PATH = "/identity/v1/oauth2/token";

/** eBay's public-data scope — the only one an Application access token needs here. */
export const SCOPE_PUBLIC_DATA = "https://api.ebay.com/oauth/api_scope";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

/**
 * eBay's standard error envelope (`handling-error-messages.html`):
 * `{ errors: [{ errorId, domain, category, message, longMessage, ... }] }`.
 * A `401` whose first error's `domain` is `"OAuth"` means the token itself is
 * the problem (expired/invalid/wrong scope) rather than the request.
 */
export interface EbayError {
  errorId?: number;
  domain?: string;
  subDomain?: string;
  category?: string;
  message?: string;
  longMessage?: string;
}

export interface EbayErrorBody {
  errors?: EbayError[];
}

export function isOAuthError(body: EbayErrorBody | null | undefined): boolean {
  return body?.errors?.[0]?.domain === "OAuth";
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook (see
 * `auth/client-credentials.ts`). `X-EBAY-C-MARKETPLACE-ID` defaults to
 * `EBAY_US` on eBay's side when omitted, so it is left to the caller.
 */
export class EbayClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const res = await this.ctx.fetch(url.toString(), { method: options.method ?? "GET", headers });

    const text = await res.text();
    const body = text ? (JSON.parse(text) as unknown) : undefined;

    if (!res.ok) {
      // eBay's own envelope names the problem in `message`/`longMessage`; fall
      // back to the raw text for the rare non-conforming response.
      const errBody = body as EbayErrorBody | undefined;
      const detail = errBody?.errors?.map((e) => e.longMessage ?? e.message).join("; ") ??
        text;
      throw new Error(
        `eBay ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }

    return body as T;
  }
}
