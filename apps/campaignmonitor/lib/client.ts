import type { HookContext } from "@w6w/types";

/**
 * Campaign Monitor API v3.3 REST client.
 *
 * Everything in this module was verified on 2026-08-11 against Campaign
 * Monitor's own reference under `www.campaignmonitor.com/api/v3-3/` (the eleven
 * section pages, 197,122 B for `getting-started/` plus 158,750–307,327 B each
 * for the ten resource pages) and against live probes of `api.createsend.com`.
 * Nothing came from a third-party integration directory.
 *
 * ## The host is createsend.com, not campaignmonitor.com
 *
 * The product is Campaign Monitor; the API lives on **`api.createsend.com`**,
 * the company's original domain. `www.campaignmonitor.com` serves only the
 * documentation. Only `api.createsend.com` is in `w6w.network.allow`.
 *
 * ## One prefix, and a version that must be pinned in code
 *
 * Every documented path is `https://api.createsend.com/api/v3.3/…`. v3.3 is the
 * current version, and the way that was established matters, because the
 * obvious checks both lie:
 *
 *  - **The docs site answers 200 for versions that do not exist.**
 *    `/api/v3-4/getting-started/`, `/api/v3-5/…` and `/api/v4/…` each return
 *    **HTTP 200** with ~138,980 B of complete, plausible reference prose. The
 *    only thing separating them from the real page is a banner reading
 *    "You're currently veiwing the docs for version 3.4, which is no longer the
 *    most up to date API version" — and for `/api/v4/` even the version number
 *    interpolates empty. `grep -c "no longer the most up to date"` is 0 on the
 *    v3-3 page and 1 on every other version page; that count, not the status
 *    code, is what identifies the current version. (A genuinely unknown *leaf*
 *    does 404: `/api/v3-3/definitely-not-real-zzz/` → 404, 108,834 B.)
 *  - **The API answers 401 for versions and paths that do not exist.**
 *    See {@link AUTH_PRECEDES_ROUTING}.
 *
 * The reference carries no `deprecat|sunset|will be removed|end of life` marker
 * for v3.3 itself; the only two hits across all eleven pages are a deprecated
 * *parameter* (`Personalize` on send-preview) and error code 110 "Deprecated
 * Method" on `setbasics`.
 *
 * ## `.json` is not optional
 *
 * The vendor's own words: "The rest of the API will return **XML by default**
 * so we recommend including `Accept: application/json` in your header, or append
 * all requests with `.json`." This client does both — the extension is built
 * into every path and `accept: application/json` is sent on every request —
 * because relying on either alone is one header away from an XML body that
 * `JSON.parse` rejects with a syntax error rather than a useful message.
 *
 * **Except under `/transactional`**, which is a different API in the same host:
 * those paths carry **no extension**, use camelCase segments (`smartEmail`,
 * `classicEmail`), are JSON-only, and are the only endpoints subject to rate
 * limiting. {@link CampaignMonitorClient.transactional} builds those.
 *
 * ## Errors
 *
 * Every failure is `{"Code": <number>, "Message": <string>}`, sometimes with a
 * `ResultData` payload (bulk import failures, invalid preview recipients).
 * `Code` is the machine-readable part and the status code is not: see
 * {@link CODE_MEANINGS} and {@link AUTH_PRECEDES_ROUTING}.
 */

/** The one and only API origin. The documentation names no other. */
export const API_BASE = "https://api.createsend.com";

/** The version prefix, pinned. See the module doc for how v3.3 was confirmed current. */
export const API_PREFIX = "/api/v3.3";

/**
 * Measured on 2026-08-11, and the single most expensive thing to learn the hard
 * way about this API: **authentication is checked before routing**.
 *
 *     GET /api/v3.3/clients.json               → 401 {"Code":100,"Message":"Invalid API Key"}
 *     GET /api/v3.3/definitely-not-real-zzz.json → 401 {"Code":100,"Message":"Invalid API Key"}
 *     GET /api/v3.4/systemdate.json            → 401 {"Code":100,"Message":"Invalid API Key"}
 *
 * All three are byte-identical. An unauthenticated probe therefore proves that
 * the *host* is answering and nothing whatsoever about whether the path exists,
 * so every endpoint this app builds was taken from the reference rather than
 * confirmed by probing. (`/api/v9.9/clients.json` and `/api/v4.0/clients.json`
 * do 404, so the router is not a blanket catch-all — it simply runs after the
 * credential check for anything under a `v3.x` prefix.)
 *
 * The same fact is what makes `health/api.ts` a *valid* reachability probe: a
 * schema-correct `{"Code":100}` from an unsigned request is proof the API is
 * up, which is exactly what that check claims and no more.
 */
export const AUTH_PRECEDES_ROUTING =
  "api.createsend.com answers 401 Code 100 for unknown paths and unknown v3.x versions, " +
  "identically to real endpoints — reachability, not existence";

/**
 * The error codes this app interprets, copied from the vendor's "Response
 * status codes" section and its per-endpoint error tables.
 *
 * The reason this exists at all is that **the HTTP status is not the
 * classifier**. Campaign Monitor returns `401 Unauthorized` for four
 * structurally different problems:
 *
 *  - `100` the API key is wrong **or was never sent** — the same body either
 *    way, so "no credential reached the request" is not distinguishable from
 *    "the credential is wrong" (both measured live: no `Authorization` header
 *    and `-u notarealkey:x` both yield `{"Code":100,"Message":"Invalid API Key"}`).
 *  - `120` / `121` / `122` the OAuth token is invalid / expired / revoked —
 *    three different fixes, and only `121` is recoverable by refreshing.
 *  - `102` **Invalid ClientID** — the credential is perfectly good and the
 *    *resource id* is wrong. Reading this as "your key expired" is the classic
 *    Campaign Monitor misdiagnosis; it arrives on the same 401 as code 100.
 *
 * and `403` likewise means two things: `Code 403` is "Not allowed for a
 * Non-agency Customer" (the credential is live, the *endpoint* is out of reach),
 * not a rejected credential.
 */
export const CODE_MEANINGS: Record<number, string> = {
  100: "Invalid API Key — the key is wrong, revoked, or never reached the request",
  102: "Invalid ClientID — the credential is fine; the client ID does not belong to this account",
  120: "Invalid OAuth Token",
  121: "Expired OAuth Token — refresh it",
  122: "Revoked OAuth Token — reconnect",
  403: "Not allowed for a Non-agency Customer — the credential is live, this endpoint is not",
  404: "No such resource",
  429: "Rate limit exceeded — only /transactional endpoints are rate limited",
  500: "Campaign Monitor server error",
};

/** Codes that mean the credential itself is unusable. `102` is deliberately absent. */
export const CREDENTIAL_FAILURE_CODES = new Set([100, 120, 121, 122]);

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/**
 * The paged envelope, identical across the suppression list, sent campaigns,
 * every subscriber-state list, the five campaign interaction reports and the
 * segment subscriber list.
 *
 * Note it is **1-indexed** (`PageNumber` starts at 1, not 0) and that
 * `PageSize` is capped at 1000 with a *minimum of 10* on the endpoints that
 * validate it (error 801: "The page size must be between 10 and 1000").
 */
export interface PagedResult<T> {
  Results: T[];
  ResultsOrderedBy?: string;
  OrderDirection?: string;
  PageNumber?: number;
  PageSize?: number;
  RecordsOnThisPage?: number;
  TotalNumberOfRecords?: number;
  NumberOfPages?: number;
}

interface CampaignMonitorErrorBody {
  Code?: number;
  Message?: string;
  ResultData?: unknown;
}

/** Keep an error message readable — a bulk-import failure body can be very long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied id.
 *
 * Client, list, segment, campaign, template and journey ids are 32-character
 * hex strings and smart-email ids are GUIDs, so nothing legitimate needs
 * escaping — but a `/` or `?` pasted into an id field would otherwise rewrite
 * the request path.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Drop query keys the caller left unset, keeping `false` and `0`.
 *
 * `includetrackingpreference=false` and `page=0` are both meaningful to this
 * API (the latter is rejected with code 800, which is a better answer than
 * silently paging from 1), so only `undefined`, `null` and `""` are dropped.
 */
export function compactQuery(query: Record<string, QueryValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

/**
 * The one response field that carries a live credential, deleted before any
 * Action returns it.
 *
 * `GET /api/v3.3/clients/{clientid}.json` is documented as returning "the
 * complete details for a client **including their API key**", and its published
 * example response opens with
 * `"ApiKey": "639d8cc27198202f5fe6037a8b17a29a59984b86d3289bc9"`. That value is
 * a *working credential* for that client — it is exactly what
 * `auth/api-key.ts` accepts — so an ordinary read of a client's details hands
 * back the keys to that client.
 *
 * A workflow step's result is persisted in the run record and routinely echoed
 * into logs, other apps and human-readable previews, so returning it would turn
 * one read into a durable credential leak. It is deleted rather than masked: a
 * masked placeholder in a field named `ApiKey` reads like a value, and
 * something downstream will try to use it. The value remains available to its
 * owner in the Campaign Monitor UI.
 *
 * This is also why that endpoint can never be the auth probe — see
 * `auth/api-key.ts`.
 */
export const REDACTED_FIELDS = ["ApiKey"] as const;

/** Remove {@link REDACTED_FIELDS} from an entity, returning a shallow copy. */
export function stripSecrets<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out.ApiKey;
  return out as T;
}

/**
 * Turn Campaign Monitor's error body into one actionable line.
 *
 * `Code` is kept verbatim and expanded via {@link CODE_MEANINGS} because the
 * status alone is ambiguous in both directions — see that constant's doc. The
 * message can carry only the vendor's own prose and the caller's own input; no
 * credential ever enters this module.
 */
export function formatError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: CampaignMonitorErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as CampaignMonitorErrorBody;
  } catch { /* not JSON — an XML or HTML body; fall through to the raw text */ }

  if (!parsed || typeof parsed.Code !== "number") {
    return truncate(`Campaign Monitor ${status} for ${method} ${path}: ${raw}`);
  }

  const parts = [
    `Campaign Monitor ${status} code ${parsed.Code} for ${method} ${path}`,
    parsed.Message,
    CODE_MEANINGS[parsed.Code],
    parsed.ResultData === undefined ? undefined : `details: ${JSON.stringify(parsed.ResultData)}`,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1200);
}

/** Parse an error body far enough to read its `Code`. Returns `undefined` if there isn't one. */
export function readErrorCode(raw: string): number | undefined {
  try {
    const body = JSON.parse(raw) as CampaignMonitorErrorBody;
    return typeof body.Code === "number" ? body.Code : undefined;
  } catch {
    return undefined;
  }
}

export class CampaignMonitorClient {
  constructor(private ctx: HookContext) {}

  /**
   * A regular v3.3 resource path. `path` is given WITHOUT the `.json`
   * extension — this method appends it, so no call site can forget and get XML.
   */
  json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(`${API_PREFIX}${path}.json`, options);
  }

  /**
   * A `/transactional` path. No extension, JSON-only, camelCase segments.
   *
   * Kept as a separate method rather than a flag because the difference is not
   * cosmetic: appending `.json` here produces a 404, and these are the only
   * endpoints that carry `X-RateLimit-*` headers or can answer 429.
   */
  transactional<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.send<T>(`${API_PREFIX}/transactional${path}`, options);
  }

  private async send<T>(fullPath: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${fullPath}`);
    for (const [k, v] of Object.entries(compactQuery(options.query ?? {}))) {
      url.searchParams.set(k, v);
    }

    // `accept` belt AND `.json` braces: the vendor documents XML as the default
    // for everything outside /transactional.
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatError(res.status, init.method ?? "GET", url.pathname, detail));
    }

    // DELETE, the suppression writes, the subscriber writes and the campaign
    // send/unschedule endpoints all answer a bare `200 OK` with an empty body.
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
