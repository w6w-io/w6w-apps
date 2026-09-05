import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Workable SPI v3 REST client.
 *
 * Everything here was verified on 2026-09-05 against Workable's own
 * ReadMe-hosted API reference (`workable.readme.io`) — specifically the
 * `account-root.json` OpenAPI 3.1 document embedded in every reference page
 * (66 paths, `info.version` `3.16.2`), the prose guides ("Getting started",
 * "Rate limiting", "What's new in v3", "Webhook Subscriptions"), and live
 * probes of `*.workable.com` and `workable.statuspage.io`. Nothing here came
 * from a third-party integration directory.
 *
 * ## There is no vendor host
 *
 * Every Workable account gets its own subdomain — `https://<subdomain>
 * .workable.com/spi/v3/...` — confirmed by the OpenAPI document's own
 * `servers` entry (`https://{subdomain}.workable.com/spi/v3`) and by the
 * "Getting started" guide's curl example. So the subdomain is a Connection
 * field, not a fixed hostname, the same posture this pack already uses for
 * `zendesk` and `gorgias`; `w6w.network.allow` is the wildcard
 * `*.workable.com`.
 *
 * ## An unauthenticated probe cannot tell a real subdomain from a fake one
 *
 * Unlike Zendesk and Gorgias, `*.workable.com` resolves through a shared
 * Cloudflare edge for EVERY subdomain (verified live: a made-up subdomain and
 * a real one resolve to the same two anycast IPs) and an unauthenticated
 * request to either answers the IDENTICAL `401
 * {"error":{"error":{"error":{"name":"invalid_token",...}}}}` body — there is
 * no 404-for-a-missing-tenant to key off. That rules out the unsigned
 * "dependency" check this pack uses for Zendesk/Gorgias: it would report `ok`
 * for a Connection whose subdomain is simply wrong. `health/account.ts`
 * probes SIGNED instead (the `azure-blob` posture), because only a real
 * request the credential's own account can answer distinguishes the two.
 *
 * ## Pagination is a body field, not a header
 *
 * `GET /jobs` and `GET /candidates` return `{ jobs: [...], paging: { next:
 * "<url>" } }` / `{ candidates: [...], paging: { next: "<url>" } }` — the next
 * page is a full URL in the JSON body (confirmed in both endpoints' own
 * documented response shape), not an RFC 5988 `Link` header the way
 * Greenhouse or GitHub page. `list()` below returns that URL verbatim rather
 * than trying to decompose it, since the vendor's own instruction is to
 * follow it as-is.
 *
 * ## `GET /candidates` is account-wide, not job-scoped, despite its own summary
 *
 * The OpenAPI document's `summary`/`description` for `operationId:
 * job-candidates-index` literally say "Returns a collection of the job's
 * candidates" — but the endpoint takes an OPTIONAL `shortcode` query
 * parameter and the docs' own prose says "If no query parameter is defined,
 * all candidates will be returned." A caller reading only the one-line
 * summary would assume `shortcode` is required.
 *
 * ## Two of the vendor's own worked-example paths are wrong
 *
 * The prose body for `job-candidates-create` and `update-candidate` both give
 * a curl example against `/spi/v3/accounts/{subdomain}/jobs/{shortcode}
 * /candidates/{candidate_id}` — a doubled, `/accounts/{subdomain}`-prefixed
 * path that does not match the OpenAPI document's own `operationId` paths
 * (`/jobs/{shortcode}/candidates`, `/candidates/{id}`), the "Getting
 * started" guide's own curl sample, or every other reference page's path.
 * This client uses the OpenAPI-declared paths — the machine-checked source
 * of truth the vendor's own doc-generation pipeline produces from — not the
 * stale prose examples.
 *
 * ## Bearer token, no OAuth
 *
 * Workable's "Access Token" (Settings → Integrations → API) is a personal
 * bearer credential with account-wide scopes chosen at generation time —
 * there is no OAuth 2.0 authorization-code flow for a general integration. A
 * separate "Partner Token" exists for officially-approved partner
 * integrations only (its own onboarding, a `X-WORKABLE-CLIENT-ID` header, and
 * an application process) and is out of scope here.
 *
 * ## Rate limits
 *
 * Documented as 10 requests / 10 seconds for account tokens, reported on
 * every response via `X-Rate-Limit-Limit` / `X-Rate-Limit-Remaining` /
 * `X-Rate-Limit-Reset`. This could not be verified live (no real credential
 * was available while building this app — an unauthenticated 401 carries
 * none of these headers), so `health/quota.ts` is built from the documented
 * header names and treats `X-Rate-Limit-Reset` as a Unix epoch timestamp (the
 * doc's own wording, "Timestamp of next interval", reads as absolute rather
 * than a delta — unlike Zendesk's `ratelimit-reset`, which is documented
 * explicitly as seconds-from-now).
 */

export function baseUrl(subdomain: string): string {
  return `https://${subdomain}.workable.com/spi/v3`;
}

/**
 * `display` is redacted Connection metadata — never the credential. Both
 * hooks in `auth/access-token.ts` record `subdomain` there so the client can
 * build a URL without ever seeing the token.
 */
export function subdomainFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { subdomain?: string };
  if (display.subdomain) return display.subdomain;
  throw new Error(
    "Workable connection has no subdomain — reconnect the account so it can be recorded.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** One page of a list endpoint: the items plus the body-borne `paging.next` URL. */
export interface ListPage<T> {
  items: T[];
  /** The full next-page URL exactly as Workable sent it, or `undefined` on the last page. */
  nextUrl?: string;
}

/** The `X-Rate-Limit-*` triple, documented on every response. */
export interface RateLimit {
  limit?: number;
  remaining?: number;
  /** Unix epoch seconds — see the client-file header for why this is treated as absolute. */
  resetAt?: number;
}

/** Read the documented rate-limit triple off any response. */
export function readRateLimit(headers: Headers): RateLimit {
  const num = (name: string): number | undefined => {
    const raw = headers.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    limit: num("x-rate-limit-limit"),
    remaining: num("x-rate-limit-remaining"),
    resetAt: num("x-rate-limit-reset"),
  };
}

export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset, so a PATCH doesn't null out untouched fields. */
export function compact<T extends Record<string, QueryValue>>(obj: T): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Turn a Workable error body into one readable line. Every documented shape is `{"error": ...}`. */
export function formatWorkableError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let message = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (parsed && typeof parsed.error === "string") {
      message = parsed.error;
    } else if (parsed && parsed.error && typeof parsed.error === "object") {
      // The auth rejection is nested: {"error":{"error":{"error":{"description":"..."}}}}.
      const asObj = (v: unknown): Record<string, unknown> | undefined =>
        v && typeof v === "object" ? v as Record<string, unknown> : undefined;
      let cur: Record<string, unknown> | undefined = asObj(parsed.error);
      for (let i = 0; i < 4 && cur; i++) {
        if (typeof cur.description === "string") {
          message = cur.description;
          break;
        }
        cur = asObj(cur.error);
      }
    }
  } catch {
    // not JSON — fall through to the raw body
  }
  return `Workable ${status} for ${method} ${path}: ${message || raw || status}`;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class WorkableClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(subdomainFromConnection(ctx.connection));
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): URL {
    const url = path.startsWith("http") ? new URL(path) : new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  private async send(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatWorkableError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }

  /** Parse a single-entity JSON body. Some endpoints (move, disqualify) answer empty/plain-text. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }

  /** For the empty-body endpoints (`move`, `disqualify`) — the HTTP status IS the result. */
  async status(path: string, options: RequestOptions = {}): Promise<{ status: number }> {
    const res = await this.send(path, options);
    return { status: res.status };
  }

  /**
   * A list endpoint's envelope: `{ [key]: T[], paging?: { next?: string } }`.
   * `envelopeKey` names the array field (`"jobs"`, `"candidates"`, ...).
   */
  async list<T = unknown>(
    path: string,
    envelopeKey: string,
    options: RequestOptions = {},
  ): Promise<ListPage<T>> {
    const body = await this.json<Record<string, unknown>>(path, options);
    const items = (body?.[envelopeKey] as T[] | undefined) ?? [];
    const paging = body?.paging as { next?: string } | undefined;
    return { items, nextUrl: paging?.next };
  }
}
