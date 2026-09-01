import type { HookContext } from "@w6w/types";

/**
 * PhantomBuster API v2 REST client.
 *
 * Everything in this module was verified on 2026-09-01 against PhantomBuster's
 * own machine-readable OpenAPI 3.0 document (`hub.phantombuster.com/reference`,
 * whose spec is also mirrored at
 * `github.com/phantombuster/public-gists/blob/master/swagger-api-v2.json`,
 * `info.version` `2.0.0`), plus live probes against `api.phantombuster.com`.
 *
 * ## Two API generations, easy to conflate
 *
 * PhantomBuster's own "API" guide page (`hub.phantombuster.com/docs/api`)
 * describes the **legacy v1** surface: base `https://phantombuster.com/api/v1`,
 * header `X-Phantombuster-Key-1`, JSend envelopes (`{"status","data"}` /
 * `{"status","message"}`). The OpenAPI document for every endpoint actually
 * listed in the reference nav — agents, containers, orgs, users, and everything
 * this app calls — declares a **different** server, header and error shape:
 * base `https://api.phantombuster.com/api/v2`, header `X-Phantombuster-Key`
 * (verified live: an empty/missing key answers
 * `{"status":"error","error":"Missing session cookie or API key (use HTTP
 * header 'X-Phantombuster-Key' or query string parameter 'key')"}`, a wrong key
 * answers `{"status":"error","error":"API key not found"}` — `error` is a flat
 * string, not `message` and not `{type, message}`). Reading the prose guide and
 * coding against `-Key-1` / `message` / `phantombuster.com/api/v1` is exactly
 * the mistake that costs a day: it is well-documented, current, and wrong for
 * every endpoint this app uses.
 *
 * ## `X-Phantombuster-Org`
 *
 * Almost every v2 endpoint accepts an optional `X-Phantombuster-Org` header:
 * "ID of the org that is performing the operation (not necessary when using a
 * third party key)". A personal API key is already scoped to one org, so this
 * is only needed for a key that can act across several — modelled here as an
 * optional, non-secret `orgId` Auth field, added by `auth/api-key.ts#sign`
 * alongside the key itself. Actions never set it directly, so there is exactly
 * one place a request's org targeting can come from.
 *
 * ## Live credentials inside ordinary reads
 *
 * `GET /orgs/fetch` returns, **unconditionally** (no opt-in query flag gates
 * them): `identityTokens` (an array of magic-link login tokens for the org)
 * and, when the org went through onboarding, `qualificationFlow.sessionCookie`
 * (a raw session cookie pasted during setup). Both are stripped by
 * `stripOrgSecrets` before `actions/org-get.ts` returns. Two OTHER
 * secret-bearing blocks — `proxies` (proxy-pool passwords) and
 * `crmIntegrations` (HubSpot/Salesforce/Pipedrive OAuth **refresh tokens**) —
 * ARE vendor-gated behind `withProxies` / `withCrmIntegrations` query flags, so
 * this app simply never sets them; see `actions/org-get.ts`.
 *
 * `GET /agents/fetch` (a single agent) also always returns `proxyPassword`
 * (that agent's dedicated proxy credential), stripped the same way. It also
 * returns `argument` and `agentObject` — the agent's launch configuration and
 * scratch state, as an **opaque JSON-encoded string** whose shape is defined by
 * the agent's own script, not by this API. For many catalog agents (LinkedIn,
 * Sales Navigator, Instagram, …) that opaque blob is where the target site's
 * session cookie lives. This client has no way to safely parse a
 * vendor-specific, per-agent-type blob without risking corrupting a caller's
 * own data (the same trap Apify's `stripSecrets` doc warns about), so it is
 * returned verbatim — callers should treat an `agent-get` result as sensitive.
 * `GET /agents/fetch-all` gates the same `argument` field behind an explicit
 * `withArgument` query flag, which `actions/agent-list.ts` never sets.
 *
 * ## Errors
 *
 * Every documented failure is `{"status":"error","error": "<message>"}`, a
 * flat string with no machine-readable code — unlike Apify's `{type,
 * message}`. There is nothing to switch on beyond the HTTP status and the
 * string itself, so `formatPhantomBusterError` keeps the string whole rather
 * than pretending to parse a taxonomy that isn't there.
 *
 * ## No documented rate limiting
 *
 * Neither the OpenAPI document nor the prose guides mention a rate limit, a
 * `429` response, or any `X-RateLimit-*` header, and none appeared on live
 * probes. See `health/request-rate.ts`.
 */

/** The only server the v2 OpenAPI document declares for every endpoint this app calls. */
export const API_BASE = "https://api.phantombuster.com";

/** Every path in the v2 document carries this prefix. */
export const API_PREFIX = "/api/v2";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface PhantomBusterErrorBody {
  status?: string;
  error?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Turn a PhantomBuster error body into one actionable line.
 *
 * The vendor's `error` field is a flat human-readable string with no stable
 * machine code (unlike Apify's `{type, message}`), so this keeps it whole
 * rather than inventing a taxonomy that doesn't exist on the wire.
 */
export function formatPhantomBusterError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: PhantomBusterErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PhantomBusterErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.error;
  if (!message) return `PhantomBuster ${status} for ${method} ${path}: ${truncate(raw)}`;
  return `PhantomBuster ${status} for ${method} ${path}: ${message}`;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** A response the caller inspects itself — used only where 204/404 are meaningful outcomes. */
export interface RawResponse<T> {
  status: number;
  body: T | undefined;
}

export class PhantomBusterClient {
  constructor(private ctx: HookContext) {}

  /** GET, parsed as JSON. Throws on any non-2xx status, including 404. */
  async get<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, { ...options, method: "GET" });
    if (!res.ok) await this.throwFor(res, "GET", path);
    return (await this.parse<T>(res)) as T;
  }

  /** POST with a JSON body, parsed as JSON. Throws on any non-2xx status. */
  async post<T = unknown>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const { body: parsed } = await this.postRaw<T>(path, body, options);
    return parsed as T;
  }

  /**
   * POST with a JSON body, returning the HTTP status alongside the parsed
   * body. Used where the vendor's OpenAPI document declares only a success
   * description and no response schema (`agent-launch`, `agent-stop`,
   * `agent-delete`) — the real status is reported rather than an assumed 200.
   */
  async postRaw<T = unknown>(
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<RawResponse<T>> {
    const res = await this.send(path, { ...options, method: "POST", body });
    if (!res.ok) await this.throwFor(res, "POST", path);
    return { status: res.status, body: await this.parse<T>(res) };
  }

  /**
   * GET without throwing on the given statuses — for the two container-read
   * endpoints that document 204 ("output is empty") or 404 ("no container
   * exists with the provided id") as normal, distinct outcomes rather than
   * failures.
   */
  async getRaw<T = unknown>(
    path: string,
    okStatuses: number[],
    options: RequestOptions = {},
  ): Promise<RawResponse<T>> {
    const res = await this.send(path, { ...options, method: "GET" });
    if (!res.ok && !okStatuses.includes(res.status)) await this.throwFor(res, "GET", path);
    return { status: res.status, body: await this.parse<T>(res) };
  }

  private async parse<T>(res: Response): Promise<T | undefined> {
    if (res.status === 204) return undefined;
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`PhantomBuster returned a non-JSON body (HTTP ${res.status})`);
    }
  }

  private async throwFor(res: Response, method: string, path: string): Promise<never> {
    const detail = await res.text().catch(() => "");
    throw new Error(formatPhantomBusterError(res.status, method, path, detail));
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    // Auth (never set here): `sign` stamps X-Phantombuster-Key and, when the
    // connection has one, X-Phantombuster-Org onto every request this client
    // makes from an Action.
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    return await this.ctx.fetch(url.toString(), init);
  }
}
