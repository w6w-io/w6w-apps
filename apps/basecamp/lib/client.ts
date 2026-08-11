import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Basecamp 5 API client.
 *
 * Every path, verb and body field here was verified on 2026-08-11 against
 * Basecamp's own sources: the REST reference at `basecamp/bc3-api` (plain
 * Markdown on GitHub) and the official OpenAPI document the vendor publishes
 * alongside its SDK — `basecamp/basecamp-sdk`, `openapi.json`, OpenAPI 3.1.0,
 * "Basecamp 2026-08-05", 167 paths.
 *
 * ## The account id is part of every URL
 *
 * All URLs are `https://3.basecampapi.com/{accountId}/…` — and, as the vendor
 * notes, "no `/api/v1` API prefix. Also, note the different domain!" One person
 * can belong to several Basecamp accounts, so the id is not derivable from the
 * token alone: it comes from `GET launchpad.37signals.com/authorization.json`,
 * which lists the accounts the token can reach. `auth/oauth.ts` reads it there
 * at connect time and publishes it on the Connection; this module reads it back
 * from `display`, never from the credential.
 *
 * ## Basecamp requires you to identify your application
 *
 * The vendor is blunt about it: every request must carry a `User-Agent` naming
 * the app **and a way to contact whoever runs it**. Their own example is
 * `MyApp (yourname@example.com)`, and a request without one can be refused.
 * {@link USER_AGENT} is that identifier, sent on every call — including the
 * unsigned health checks, since the requirement is about the caller rather than
 * the credential.
 *
 * ## Flat routes are canonical
 *
 * Every resource is addressable by its own id — `GET /todos/67890.json`,
 * `POST /recordings/123/comments.json` — with the project derived server-side.
 * The older `/buckets/{project_id}/…` form still works "in perpetuity" but the
 * vendor calls it legacy, so this app uses the flat form throughout. That is why
 * most actions take one id rather than a project *and* a resource id.
 *
 * ## Everything is a "recording"
 *
 * Messages, to-dos, documents and uploads are all recordings underneath, which
 * is why a single `POST /recordings/{id}/comments.json` comments on any of them.
 * One action covers what would otherwise be four.
 */

export const BASE_URL = "https://3.basecampapi.com";
export const LAUNCHPAD_URL = "https://launchpad.37signals.com";

/**
 * The `User-Agent` Basecamp requires, in the vendor's documented shape:
 * an application name and a contact address.
 */
export const USER_AGENT = "w6w (https://github.com/w6w-io/w6w-apps)";

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface BasecampConnectionDisplay {
  accountId?: string | number;
}

/** Read the account id off the redacted Connection. Never touches the credential. */
export function accountIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as BasecampConnectionDisplay;
  const accountId = display.accountId;
  if (accountId === undefined || accountId === null || `${accountId}` === "") {
    throw new Error(
      "Basecamp connection records no account id — reconnect it so the account can be stored.",
    );
  }
  return String(accountId);
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a comma-separated or array param into a list of numbers. */
export function toIdList(v: string | undefined | null, label: string): number[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const ids = v.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${label}: "${s}" is not an id`);
    return n;
  });
  return ids.length ? ids : undefined;
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render a Basecamp failure as one actionable line.
 *
 * Basecamp answers `{"error": "…"}` for most failures. Two status codes get
 * their own sentence because the fix is specific and not guessable:
 *
 *  - **429** — Basecamp rate-limits to 50 requests per 10 seconds per token and
 *    returns `Retry-After`. Unlike a daily quota this really does clear in
 *    moments, so the message says how long.
 *  - **404** — with flat routes, a 404 is as often "this token's account cannot
 *    see that resource" as "no such id", because the account is in the URL.
 */
export function formatBasecampError(
  status: number,
  method: string,
  path: string,
  raw: string,
  retryAfter?: string | null,
): string {
  let detail = "";
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    detail = parsed?.error ?? parsed?.message ?? "";
  } catch { /* not JSON — fall through to the raw body */ }

  if (status === 429) {
    const wait = retryAfter ? ` Retry after ${retryAfter}s.` : "";
    return truncate(
      `Basecamp 429 for ${method} ${path}: rate limited — 50 requests per 10 seconds per token.` +
        `${wait}${detail ? ` (${detail})` : ""}`,
      1000,
    );
  }
  if (status === 404) {
    return truncate(
      `Basecamp 404 for ${method} ${path}${detail ? `: ${detail}` : ""} — the id may not exist, ` +
        "or this connection's account may not have access to it.",
      1000,
    );
  }
  if (!detail) return `Basecamp ${status} for ${method} ${path}: ${truncate(raw)}`;
  return truncate(`Basecamp ${status} for ${method} ${path}: ${detail}`, 1000);
}

export class BasecampClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = `${BASE_URL}/${accountIdFromConnection(ctx.connection)}`;
  }

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      // Required by Basecamp — see the module docs. Not a nicety.
      "user-agent": USER_AGENT,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatBasecampError(
          res.status,
          init.method ?? "GET",
          url.pathname,
          detail,
          res.headers.get("retry-after"),
        ),
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
