import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Wufoo REST API v3 client.
 *
 * Every path, parameter and operator here was verified on 2026-08-11 against
 * Wufoo's own API documentation (`wufoo.github.io/docs/`, the vendor's published
 * reference) plus live probes against `api.wufoo.com`.
 *
 * ## The host is `{subdomain}.wufoo.com`, and the subdomain is the account
 *
 * Every request goes to `https://{subdomain}.wufoo.com/api/v3/…` — the vendor's
 * own examples use the demo account `fishbowl`. There is no single API host: an
 * API key belongs to one account and only works on that account's subdomain.
 *
 * So the subdomain is an **Auth field**, not an Action param — it and the key
 * are two halves of one Connection — and `network.allow` is `["*.wufoo.com"]`.
 * Note that is the *narrow* wildcard, not `["*"]`: unlike the self-hosted apps
 * in this pack, every Wufoo account really is under one apex, so the allowlist
 * can say so.
 *
 * ## Authentication is HTTP Basic with the key as the *username*
 *
 * From the vendor's own curl:
 *
 *     curl -u "AOI6-LFKL-VM1Q-IEX9":"footastic" \
 *          "https://fishbowl.wufoo.com/api/v3/forms.json"
 *
 * The API key is the username and **the password is ignored** — `footastic` is
 * the documentation's joke placeholder, not a shared secret. `auth/api-key.ts`
 * sends a fixed placeholder for the same reason.
 *
 * ## Two response shapes, and both are quirky
 *
 * Reads answer with a single-key envelope named after the collection —
 * `{"Forms": [...]}`, `{"Entries": [...]}`, `{"Fields": [...]}` — which
 * `unwrap` peels so an action returns the array a workflow wants.
 *
 * Entry *submission* is different in two ways: the request is
 * **form-encoded**, not JSON, and a rejected submission comes back **200 with
 * `Success: 0`** and a `FieldErrors` array. See `actions/entry-create.ts`.
 */

/** Wufoo's documented API-key shape: four hyphenated groups of four. */
export const API_KEY_PATTERN = /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/;

/**
 * The password Wufoo ignores.
 *
 * Basic auth requires *something* after the colon and the vendor's examples use
 * `footastic`. It is not a credential, it is a placeholder, and it is a constant
 * here so nobody mistakes it for a second secret worth collecting from the user.
 */
export const IGNORED_PASSWORD = "footastic";

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface WufooConnectionDisplay {
  /** The account subdomain — the `fishbowl` in `fishbowl.wufoo.com`. */
  subdomain?: string;
}

/**
 * Reduce whatever the user pasted to a bare account subdomain.
 *
 * People paste `fishbowl`, `fishbowl.wufoo.com`, `https://fishbowl.wufoo.com/`
 * and a link to a form. All name the same account, and only the first component
 * matters.
 *
 * Anything that is not a plausible subdomain is rejected here rather than
 * turned into a URL that resolves to somebody else's account.
 */
export function normalizeSubdomain(raw: string): string {
  let value = raw.trim();
  if (!value) throw new Error("Wufoo subdomain is empty");
  value = value.replace(/^https?:\/\//i, "");
  value = value.split("/")[0];
  value = value.replace(/\.wufoo\.(com|eu)$/i, "");
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(value)) {
    throw new Error(
      `"${raw}" is not a Wufoo subdomain. Use the account name from your Wufoo URL — the ` +
        "`fishbowl` in `fishbowl.wufoo.com`.",
    );
  }
  return value.toLowerCase();
}

/** Build the API base for an account. */
export function baseUrlFor(subdomain: string): string {
  return `https://${normalizeSubdomain(subdomain)}.wufoo.com/api/v3`;
}

/** Read the account subdomain off the redacted Connection. Never touches the credential. */
export function subdomainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as WufooConnectionDisplay;
  if (display.subdomain) return normalizeSubdomain(display.subdomain);
  throw new Error(
    "Wufoo connection records no account subdomain — reconnect it so the subdomain can be stored.",
  );
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Sent as `application/x-www-form-urlencoded`, which is what entry submission takes. */
  form?: Record<string, string>;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Peel Wufoo's single-key envelope.
 *
 * Reads answer `{"Forms": [...]}`, `{"Entries": [...]}`, `{"Fields": [...]}` and
 * so on. Returning the inner array is what a workflow wants; returning the
 * wrapper would make every downstream step index by a capitalised key.
 *
 * A response that is *not* that shape is returned unchanged rather than
 * coerced — the entry-count endpoint answers `{"EntryCount": "42"}`, which is a
 * value rather than a collection, and forcing it through would lose it.
 */
export function unwrap<T = unknown>(body: unknown, key: string): T {
  if (body && typeof body === "object" && key in (body as Record<string, unknown>)) {
    return (body as Record<string, T>)[key];
  }
  return body as T;
}

/**
 * Render a Wufoo error as one actionable line.
 *
 * Wufoo's failures are inconsistent by design: a bad key is a bare `401` with an
 * HTML body, a rate-limited submission is `{"Text":"Slow Down","HTTPCode":429}`,
 * and a bad request is `{"HTTPCode":400,"Text":"…"}`. `Text` is the useful half
 * wherever it appears.
 */
export function formatWufooError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: { Text?: string; HTTPCode?: number } | null = null;
  try {
    parsed = JSON.parse(raw) as { Text?: string; HTTPCode?: number };
  } catch { /* not JSON — Wufoo serves HTML for some failures */ }

  if (parsed?.Text) {
    return truncate(`Wufoo ${status} for ${method} ${path}: ${parsed.Text}`, 1000);
  }
  if (status === 401) {
    return `Wufoo 401 for ${method} ${path}: the API key was rejected. Check it belongs to this ` +
      "account's subdomain.";
  }
  return `Wufoo ${status} for ${method} ${path}: ${truncate(raw)}`;
}

export class WufooClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFor(subdomainFromConnection(ctx.connection));
  }

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form !== undefined) {
      // Entry submission is form-encoded, not JSON. Wufoo rejects a JSON body on
      // this endpoint outright — see actions/entry-create.ts.
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = new URLSearchParams(options.form).toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatWufooError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
