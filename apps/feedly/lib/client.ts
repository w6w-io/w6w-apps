import type { HookContext } from "@w6w/types";

/**
 * Feedly for Threat Intelligence (Enterprise) API v3 — `api.feedly.com`.
 *
 * ## What this app is actually built against
 *
 * `developers.feedly.com` today publishes exactly one API: **Feedly for
 * Threat Intelligence**, Feedly's Enterprise product. Every page in the
 * reference index (`https://developers.feedly.com/llms.txt`, fetched
 * 2026-09-06) sits under that umbrella, and the Authorization page says so
 * outright: "Self service API tokens are only available to Enterprise
 * clients." There is no separate, still-documented "classic" consumer API —
 * the old `cloud.feedly.com` examples that appear in a couple of legacy pages
 * (see below) point at the *same* backend and the *same* bearer-token scheme,
 * not at a different, more-open surface.
 *
 * That matters for what this app can be: the token is **Enterprise-gated**,
 * but it is not an OAuth2 token and there is no authorization-code dance to
 * implement. Per the Authorization page, an admin mints a long-lived opaque
 * token from `https://feedly.com/i/team/api` and every request just carries
 * `Authorization: Bearer <token>`. Mechanically this is the simplest possible
 * shape (`type: "bearer"`, one secret field) — the gate is commercial (does
 * this tenant have a Feedly Enterprise contract), not technical.
 *
 * ## Host: `api.feedly.com`, verified independently of the docs
 *
 * Every current OpenAPI definition in the reference (`collect-articles`,
 * `search`, `get-article-metadata`, `get-multiple-article-metadata`,
 * `get-list-of-ai-feeds`, `getteamfolders`, `get-list-of-team-boards`,
 * `add-articles-to-board`, `delete-article-from-board`, `annotate-articles`,
 * `listenterpriseusers`, the three webhook endpoints) declares its `servers`
 * block as `https://api.feedly.com/v3/...`. Two older prose pages instead
 * show `cloud.feedly.com` (the Authorization page's curl example) or bare
 * `feedly.com` (the "Building your first TI integration" tutorial and the
 * "Using the Search API" guide) — both stale copy predating a host
 * consolidation. Live probes on 2026-09-06 confirm which one is current:
 *
 * | Host                  | `GET /v3/profile` (no token) |
 * | ---------------------- | ----------------------------- |
 * | `api.feedly.com`       | `401 {"errorMessage":"must provide authorization token"}` |
 * | `cloud.feedly.com`     | same 401 — still alive, likely a proxy/alias in front of the same backend |
 *
 * Both answer identically, so `cloud.feedly.com` is not wrong, exactly — but
 * `api.feedly.com` is what every current, machine-readable definition
 * declares, so it is the only host this app's manifest allowlists.
 *
 * ## Two 401 wordings for the same "no credential" case
 *
 * Live probes on 2026-09-06 found the *unauthenticated* error message differs
 * by route family, for no documented reason:
 *
 *  - `/v3/profile`, `/v3/entries/*`, `/v3/tags/*`, `/v3/search/*` answer
 *    `{"errorMessage":"must provide authorization token"}`.
 *  - the `/v3/enterprise/*` and `/v3/alerts` family answers
 *    `{"errorMessage":"must be logged in"}`.
 *
 * A bad-but-present token answers `{"errorMessage":"invalid token"}` on
 * every route family alike (confirmed on `/v3/profile`). `auth/bearer-token.ts`
 * treats all three `errorMessage` values as facts about the *credential*, not
 * the vendor's health.
 *
 * ## Streams and `.mget` don't always require a credential
 *
 * `GET /v3/streams/contents?streamId=feed/<public RSS URL>` and
 * `POST /v3/entries/.mget` both answered `200` **unauthenticated** in a live
 * probe (a public `feed/...` stream, and an empty/unrecognised id list,
 * respectively) — Feedly evidently treats public RSS content and
 * unresolvable ids as free reads. Every action this app actually exposes is
 * built for a team's `enterprise/<team>/...` streams and real Feedly-minted
 * entry ids, which the same probes show DO enforce the token, so
 * `requiresAuth` stays at the app's default (`true`) throughout — a
 * Connection is what makes any of this useful, even where the raw
 * transport would let an unsigned request slip through.
 *
 * ## One path this app deliberately does NOT copy verbatim from the docs
 *
 * The "Delete a Webhook" page's OpenAPI document gives the path as
 * `/triggers/:{triggerid}` — a literal `:` immediately before the `{param}`
 * brace, which is not valid OpenAPI path-templating syntax and reads like an
 * Express route (`router.delete('/triggers/:triggerid', ...)`) pasted into
 * the generator by mistake. Every sibling delete in this same API family
 * (`delete-article-from-board`: `/{streamId}/{entryId}`) uses the ordinary
 * form with no stray colon, so {@link webhookPath} builds
 * `/enterprise/triggers/{triggerId}` instead. Both spellings answered an
 * identical `401 must be logged in` unauthenticated (2026-09-06), which
 * doesn't disambiguate them — the auth check runs before routing gets far
 * enough to 404 a bad path — so this is a documented judgment call, not a
 * verified fact; see `README.md`.
 *
 * ## Rate limits
 *
 * A token is capped at 100,000 requests/month (Authorization page). Every
 * response carries `X-RateLimit-Count` (calls made so far) and
 * `X-RateLimit-Reset` (seconds until the counter resets); the Status Codes
 * page additionally documents `X-RateLimit-Limit`. `health/quota.ts` reads
 * exactly these three headers off a live signed call.
 */

export const API_BASE = "https://api.feedly.com";

/** Every request path in this client, kept absolute and host-free. */
export type Query = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
}

interface FeedlyErrorBody {
  errorCode?: number;
  errorMessage?: string;
  errorId?: string;
  requestId?: string;
}

/** Drop query entries the caller left unset — Feedly treats an empty string as "set". */
export function compactQuery(query: Query): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

/**
 * Turn Feedly's `{errorCode, errorMessage, requestId}` body into one line.
 *
 * `errorMessage` is kept verbatim because it is the only stable, documented
 * signal for *why* a call failed ("must provide authorization token",
 * "invalid token", "invalid stream id", "unknown tag", …) — collapsing every
 * 4xx to "Feedly 4xx" would erase exactly the distinction a caller needs to
 * fix their own request versus reconnect the credential.
 */
export function formatFeedlyError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let body: FeedlyErrorBody | null = null;
  try {
    body = JSON.parse(raw) as FeedlyErrorBody;
  } catch { /* not JSON — fall through to the raw text */ }

  if (!body?.errorMessage) {
    const trimmed = raw.length > 500 ? `${raw.slice(0, 500)}… (truncated)` : raw;
    return `Feedly ${status} for ${method} ${path}: ${trimmed || "(empty body)"}`;
  }
  return `Feedly ${status} for ${method} ${path}: ${body.errorMessage}` +
    (status === 429 ? " — the token's 100,000 requests/month cap has been reached" : "");
}

export class FeedlyClient {
  constructor(private ctx: HookContext) {}

  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only — for the two `DELETE`s, which answer with no useful body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(compactQuery(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatFeedlyError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/**
 * The conventional (no stray colon) form of the webhook-by-id path. See the
 * module doc for why the literal `/triggers/:{triggerid}` in the vendor's own
 * OpenAPI document is not copied verbatim.
 */
export function webhookPath(triggerId: string): string {
  return `/v3/enterprise/triggers/${encodeURIComponent(triggerId)}`;
}
