import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.youcanbook.me/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` for the YouCanBookMe (YCBM) API v1. Never sets
 * Authorization — the runtime routes the request through the auth `sign` hook,
 * which injects the HTTP Basic header (account id + API key).
 *
 * Base URL and path shape verified two ways:
 *  - A full Swagger 2.0 spec archived by the Wayback Machine on 2021-08-14
 *    from `https://api.youcanbook.me/v1/api-docs?group=api` (the vendor's own
 *    docs page — `api.youcanbook.me/docs/index.html` — has been a dead
 *    meta-refresh to a client-rendered Stoplight SPA since at least 2020; the
 *    SPA itself was JS-rendered with no static spec URL, so this archived
 *    machine-readable export is the only concrete source of endpoint paths
 *    and schemas found). It documents every path used below under
 *    `/v1/{accountId}/...`.
 *  - Live, unauthenticated probes against `https://api.youcanbook.me/v1/...`
 *    (2026-09-01): `/v1/{accountId}`, `/v1/{accountId}/bookings` and
 *    `/v1/{accountId}/profiles` all answer `401 caligraph_not_using_basic_authentication`
 *    (a route that requires auth), while `/v1/{accountId}/remoteaccounts` and
 *    `/v1/{accountId}/queries` — both present in the 2021 spec — now answer
 *    `404 ycbm_api_http_resource_not_found`. That live check is why this app
 *    implements only Bookings, Profiles, Appointment Types and Team Members:
 *    it matches both the live API's actual route table and the four
 *    concepts the vendor's own current documentation (its Stoplight
 *    project's live page description, fetched 2026-09-01) still describes
 *    ("Profiles / Bookings / Team Members / Appointment Types"), dropping the
 *    2021 spec's Remote Accounts / Calendars / Events / Queries surface.
 *
 * Every account-scoped path requires the account id as an explicit path
 * segment — it is not implied by the credential, because an action never
 * sees the credential. Every action below takes `accountId` as a required
 * param for that reason.
 */
export class YouCanBookMeClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
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
        `YouCanBookMe ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}
