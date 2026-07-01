import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Mailchimp's API base depends on the account's *datacenter*: every account
 * lives on a shard like `us1`, `us14`, `eu2`, ... and every API call must go
 * to `https://<dc>.api.mailchimp.com/3.0/`. Where the datacenter comes from
 * differs per auth:
 *   - API key: suffix of the key itself (`abcdef-us14` → `us14`).
 *   - OAuth2: returned by `https://login.mailchimp.com/oauth2/metadata` as
 *     `api_endpoint` (a full URL); we parse it in `afterConnect` and stash
 *     the datacenter on the profile.
 * The client is auth-agnostic — it reads the datacenter from either the
 * credential (api-key path) or the connection profile (oauth2 path).
 */

export const API_HOST_SUFFIX = "api.mailchimp.com/3.0";

/** Common shape of Mailchimp list responses: an envelope with a named array + `total_items`. */
export type MailchimpListResponse<K extends string, T = unknown> =
  & {
    total_items?: number;
    _links?: unknown;
  }
  & { [P in K]: T[] };

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Extract the datacenter suffix from a Mailchimp API key (`abcdef-us14` → `us14`). */
export function datacenterFromApiKey(apiKey: string): string {
  const idx = apiKey.lastIndexOf("-");
  if (idx < 0 || idx === apiKey.length - 1) {
    throw new Error(
      "Mailchimp API key must include a datacenter suffix (e.g. `abcdef-us14`).",
    );
  }
  return apiKey.slice(idx + 1);
}

/** Extract the datacenter from a Mailchimp OAuth metadata `api_endpoint` URL. */
export function datacenterFromApiEndpoint(apiEndpoint: string): string {
  try {
    const host = new URL(apiEndpoint).host;
    const first = host.split(".")[0];
    if (!first) throw new Error("empty host");
    return first;
  } catch {
    throw new Error(`Mailchimp api_endpoint is not a valid URL: ${apiEndpoint}`);
  }
}

/**
 * Read the datacenter for the current connection from the redacted `display`
 * data (populated by an Auth's `afterConnect`). Both api-key and oauth2 auth
 * methods store `{ datacenter: "us14" }` there.
 */
export function datacenterFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { datacenter?: string };
  if (display.datacenter) return display.datacenter;
  throw new Error(
    "Mailchimp connection has no datacenter — connect via API key or complete OAuth first.",
  );
}

/**
 * Thin wrapper around `ctx.fetch`. Never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which injects it.
 */
export class MailchimpClient {
  private base: string;

  constructor(private ctx: HookContext, opts: { datacenter?: string } = {}) {
    const dc = opts.datacenter ?? datacenterFromConnection(ctx.connection);
    this.base = `https://${dc}.${API_HOST_SUFFIX}`;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${this.base}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Mailchimp ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
