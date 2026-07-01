import type { HookContext } from "@w6w/types";

/**
 * WordPress' REST API is self-hosted (`https://<your-site>/wp-json/wp/v2`) or
 * WordPress.com-hosted (`https://public-api.wordpress.com/wp/v2/sites/<site>`).
 * Both paths flow through this client — the base URL is resolved from the
 * caller's Connection at request time.
 *
 * NOTE: The App manifest sets `network.allow: ["*"]` because self-hosted
 * WordPress lives on the customer's own domain and we can't allow-list it.
 */
export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  body?: unknown;
}

/**
 * Public (redacted-safe) connection metadata we care about. The auth method's
 * `afterConnect` hook publishes this onto `connection.display` so action code
 * can compute the base URL without touching the credential.
 */
export interface WordPressConnectionDisplay {
  /** For `basic`: base URL of the self-hosted install, e.g. `https://example.com`. */
  siteUrl?: string;
  /** For `oauth2`: the WordPress.com site identifier, e.g. `myblog.wordpress.com`. */
  wordpressSite?: string;
}

/**
 * Resolve the base URL from public connection metadata. Basic auth targets the
 * customer's own install; OAuth2 always targets WordPress.com's public REST API.
 */
export function resolveBaseUrl(display: WordPressConnectionDisplay | undefined): string {
  if (display?.siteUrl) {
    const trimmed = display.siteUrl.replace(/\/+$/, "");
    return `${trimmed}/wp-json/wp/v2`;
  }
  if (display?.wordpressSite) {
    let host = display.wordpressSite;
    try {
      host = new URL(host).hostname;
    } catch {
      host = host.split("/")[0];
    }
    return `https://public-api.wordpress.com/wp/v2/sites/${host}`;
  }
  throw new Error("WordPress connection is missing siteUrl / wordpressSite");
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the
 * auth method's `sign` hook — we never touch it here.
 */
export class WordPressClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): WordPressClient {
    const display = (ctx.connection?.display ?? {}) as WordPressConnectionDisplay;
    return new WordPressClient(ctx, resolveBaseUrl(display));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          if (v.length === 0) continue;
          url.searchParams.set(k, v.join(","));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      (init.headers as Record<string, string>)["accept"] = "application/json";
      init.body = JSON.stringify(options.body);
    } else {
      (init.headers as Record<string, string>)["accept"] = "application/json";
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `WordPress ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
