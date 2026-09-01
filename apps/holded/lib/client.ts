import type { HookContext } from "@w6w/types";

/**
 * Holded CRM API v1 REST client.
 *
 * Verified on 2026-09-01 against the CRM API's own OpenAPI 3.0 document — the
 * one embedded server-side in every `holded.readme.io/reference/*` page
 * (`document.api.schema` in that page's `ssr-props` payload; `info.title`
 * "CRM API", `info.version` "1.0") — plus live, unauthenticated probes against
 * `api.holded.com`.
 *
 * ## Two documentation surfaces, and only one of them is real
 *
 * Holded's vanity domain, `developers.holded.com`, now 301-redirects to a
 * marketing page (`www.holded.com/es/desarrolladores`) whose "API reference"
 * copy is inconsistent with the live API: it shows `Bearer` auth against
 * `/api/v2/...` paths and `X-RateLimit-*` response headers. None of that
 * matches. A live, unauthenticated request to `/api/crm/v1/funnels` answers
 * `401 {"status":401}` with **no** `www-authenticate` challenge and no
 * `X-RateLimit-*` headers of any kind, and a request carrying a syntactically
 * plausible but wrong `key` header answers `400 {"status":0,"info":"Invalid
 * key"}` — again with no rate-limit headers. That marketing copy was not used
 * for anything in this app.
 *
 * Holded's *actual* API reference is still live, just not at the vanity
 * domain: the underlying ReadMe.io project (`holded.readme.io`) serves the
 * real, current OpenAPI documents this app was built from, and every path,
 * verb and field below was read from there and cross-checked against the live
 * host.
 *
 * ## One host, one prefix, no pagination
 *
 * Every CRM path in the OpenAPI document hangs off the single declared server,
 * `https://api.holded.com/api/crm/v1`. There is no regional host. None of the
 * three list endpoints this app covers (`GET /funnels`, `GET /leads`,
 * `GET /events`) declares a query parameter of any kind in the spec — no page,
 * no limit, no filter — so a List action here returns Holded's full collection
 * in one call, and there is nothing to paginate.
 *
 * ## Two response shapes
 *
 * A **read** (`GET`) answers the resource itself — an array for a list, an
 * object for a single record. A **write** (`POST`/`PUT`/`DELETE`) answers a
 * small envelope, `{status, info, id?}` — `status: 1` for success, `info` a
 * short human string ("Created", "Updated", "Successfully deleted"), `id` the
 * affected record's id on create. Errors, both from Holded's own app layer and
 * from the gateway that rejects a missing credential, use the same `status`
 * field for a different purpose: `0` for an app-layer error (with `info`
 * explaining why) and a bare HTTP-style code (e.g. `401`) with no `info` for a
 * gateway-layer rejection that never reached app code. This client treats any
 * non-2xx response as an error regardless of which shape the body took.
 */

/** The one and only CRM API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.holded.com/api/crm/v1";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The envelope every write (`POST`/`PUT`/`DELETE`) answers with. */
export interface HoldedMutationResult {
  status: number;
  info?: string;
  id?: string;
}

interface HoldedErrorBody {
  status?: number;
  info?: string;
}

/**
 * Drop keys the caller left unset, so an optional field that was never typed
 * in never rides along as `undefined` (which `JSON.stringify` keeps for object
 * values inside nested structures but Holded should simply never see).
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Path-escape a caller-supplied resource id. */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Accept a `json`-typed param as either a parsed value or the string a user
 * typed (the host hands a `json` param through in whichever shape it arrived
 * in, so both are handled here rather than at each call site).
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Normalise a `multiselect`/tags param into a comma-splittable string array. */
export function toStringList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Turn Holded's error body into one actionable line.
 *
 * `info` carries Holded's own explanation ("Invalid key", "Not found") when
 * the app layer produced the error; a gateway-layer rejection (missing
 * credential entirely) carries no `info`, so the HTTP status is all there is
 * to report.
 */
export function formatHoldedError(
  status: number,
  method: string,
  path: string,
  body: HoldedErrorBody | null,
): string {
  const info = body?.info;
  return `Holded ${status} for ${method} ${path}${info ? `: ${info}` : ""}`;
}

export class HoldedClient {
  constructor(private ctx: HookContext) {}

  /** `GET` returning the resource itself — an array for a list, an object for one record. */
  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.send<T>(path, { method: "GET", query });
  }

  /** `POST`/`PUT` returning the `{status, info, id?}` write envelope. */
  write(path: string, method: "POST" | "PUT", body?: unknown): Promise<HoldedMutationResult> {
    return this.send<HoldedMutationResult>(path, { method, body });
  }

  /**
   * `DELETE` returning the `{status, info, id?}` write envelope.
   *
   * `body` exists because Delete Lead Task addresses the record to delete by a
   * request-body `taskId` rather than a path segment — the one delete in this
   * app's surface that is not addressed purely by URL.
   */
  delete(path: string, body?: unknown): Promise<HoldedMutationResult> {
    return this.send<HoldedMutationResult>(path, { method: "DELETE", body });
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const method = options.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!res.ok) {
      throw new Error(
        formatHoldedError(res.status, method, url.pathname, parsed as HoldedErrorBody | null),
      );
    }
    return parsed as T;
  }
}
