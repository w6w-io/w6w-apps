import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Zuora's v1 REST API — verified 2026-09-05 against the live Redoc/Stoplight
 * reference at `developer.zuora.com/v1-api-reference/introduction` (and the
 * per-operation pages under it, fetched via their `.md` mirror) and the
 * `Rate limits` / `Object Query` guides under `developer.zuora.com/docs/guides`.
 *
 * ## Ten hosts, not two
 *
 * Zuora runs each tenant in one of three regions (US, EU, APAC), and within
 * a region a tenant lives on one of two clouds for US, or one cloud for EU/APAC —
 * plus a developer/trial sandbox and (US/EU only) a dedicated API sandbox. The
 * introduction page lists exactly these ten, and no others:
 *
 * | Environment                          | Base URL                          |
 * |---------------------------------------|-----------------------------------|
 * | US Developer & Central Sandbox         | `rest.test.zuora.com`             |
 * | US API Sandbox (Cloud 1)               | `rest.sandbox.na.zuora.com`       |
 * | US API Sandbox (Cloud 2)               | `rest.apisandbox.zuora.com`       |
 * | US Production (Cloud 1)                | `rest.na.zuora.com`               |
 * | US Production (Cloud 2)                | `rest.zuora.com`                  |
 * | EU Developer & Central Sandbox         | `rest.test.eu.zuora.com`          |
 * | EU API Sandbox                         | `rest.sandbox.eu.zuora.com`       |
 * | EU Production                          | `rest.eu.zuora.com`               |
 * | APAC Developer & Central Sandbox       | `rest.test.ap.zuora.com`          |
 * | APAC Production                        | `rest.ap.zuora.com`               |
 *
 * There is no APAC API Sandbox — only APAC's Developer & Central Sandbox and
 * Production. A tenant's cloud (1 vs 2, for US) is assigned at provisioning
 * and is not something a caller chooses; the connection's `region` field picks
 * the host that matches wherever Zuora actually put the tenant.
 *
 * ## Auth is a plain client-credentials exchange, and it is IP-rate-limited
 *
 * `POST /oauth/token` on the SAME regional host, `application/x-www-form-urlencoded`
 * (not JSON) with `client_id` + `client_secret` + `grant_type=client_credentials`.
 * See `auth/client-credentials.ts`. Zuora's own docs warn against minting a new
 * token per request: the endpoint is "rate limited by IP address" and the OAuth
 * rate limit (2,000/min, but only 100/min PER IP) is separate from and far
 * tighter than the general API limit.
 *
 * ## Rate and concurrency limits (verified against the Rate Limits guide)
 *
 * Requests are bucketed UI / AUTH / API, each with its own RPM/RPH/RPD ceiling
 * that varies by tenant type (Production, Developer Sandbox, API Sandbox — the
 * sandboxes are far tighter, e.g. API Sandbox: 2,500 RPM). Every response also
 * carries `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset` headers.
 * Independently, Zuora enforces CONCURRENT request limits per tenant (40
 * default, 80 for Object Query, 200 for a short list of "high-volume"
 * operations that includes Create an account, Create an order and Create a
 * subscription) — a burst of concurrent workflow runs can 429 well before the
 * per-minute ceiling is hit.
 *
 * ## Two response shapes, and a third for the newer surface
 *
 * Most `/v1/*` endpoints answer errors as `{"success": false, "processId": "…",
 * "reasons": [{"code": 53100320, "message": "…"}]}` — an HTTP status plus a
 * numeric Zuora error code, not just the status. The newer `/object-query/*`
 * surface (used here for every list action, because it is the one part of the
 * v1 API with a real, generic "list" operation with cursor pagination) answers
 * errors as `{"reasons": [...], "requestId": "…"}` — no `success` field. Both
 * are handled uniformly by {@link describeError}.
 *
 * ## `Idempotency-Key` is documented for POST and PATCH ONLY
 *
 * Zuora's own header doc is explicit: "Do not use this header in other request
 * types." Zuora's v1 API has no PATCH endpoints in the surface this app calls —
 * only POST (create) and PUT (update) — so this app sets `Idempotency-Key` on
 * every create action (`account-create`, `subscription-create`, `order-create`)
 * and never on an update, even though PUT is nominally as "safe" a place for one.
 * Missing this is easy: the header exists, PUT is the obvious place idempotency
 * would matter for "update a subscription", and Zuora silently accepts (and
 * presumably ignores) the header on a PUT rather than rejecting it — there is
 * no error to catch the mistake.
 */

export interface ZuoraRegion {
  key: string;
  label: string;
  apiHost: string;
  /** For the `service` health check — see `health/service.ts`. */
  statusGroup: "NA1" | "NA2" | "EU1" | "AP1";
  statusComponent: "Production API" | "Sandbox API" | "Central Sandbox";
}

/** The ten hosts Zuora's own reference enumerates. No others exist. */
export const REGIONS: ZuoraRegion[] = [
  {
    key: "us-cloud2",
    label: "US Production (Cloud 2)",
    apiHost: "rest.zuora.com",
    statusGroup: "NA2",
    statusComponent: "Production API",
  },
  {
    key: "us-cloud1",
    label: "US Production (Cloud 1)",
    apiHost: "rest.na.zuora.com",
    statusGroup: "NA1",
    statusComponent: "Production API",
  },
  {
    key: "eu",
    label: "EU Production",
    apiHost: "rest.eu.zuora.com",
    statusGroup: "EU1",
    statusComponent: "Production API",
  },
  {
    key: "ap",
    label: "APAC Production",
    apiHost: "rest.ap.zuora.com",
    statusGroup: "AP1",
    statusComponent: "Production API",
  },
  {
    key: "us-cloud2-sandbox",
    label: "US API Sandbox (Cloud 2)",
    apiHost: "rest.apisandbox.zuora.com",
    statusGroup: "NA2",
    statusComponent: "Sandbox API",
  },
  {
    key: "us-cloud1-sandbox",
    label: "US API Sandbox (Cloud 1)",
    apiHost: "rest.sandbox.na.zuora.com",
    statusGroup: "NA1",
    statusComponent: "Sandbox API",
  },
  {
    key: "eu-sandbox",
    label: "EU API Sandbox",
    apiHost: "rest.sandbox.eu.zuora.com",
    statusGroup: "EU1",
    statusComponent: "Sandbox API",
  },
  {
    key: "us-central",
    label: "US Developer & Central Sandbox (Test Drive / trial)",
    apiHost: "rest.test.zuora.com",
    statusGroup: "NA2",
    statusComponent: "Central Sandbox",
  },
  {
    key: "eu-central",
    label: "EU Developer & Central Sandbox",
    apiHost: "rest.test.eu.zuora.com",
    statusGroup: "EU1",
    statusComponent: "Central Sandbox",
  },
  {
    key: "ap-central",
    label: "APAC Developer & Central Sandbox",
    apiHost: "rest.test.ap.zuora.com",
    statusGroup: "AP1",
    statusComponent: "Central Sandbox",
  },
];

const REGIONS_BY_KEY: Record<string, ZuoraRegion> = Object.fromEntries(
  REGIONS.map((r) => [r.key, r]),
);

/** Every hostname a hook may call — mirrored verbatim into `package.json#w6w.network.allow`. */
export const NETWORK_ALLOW: string[] = REGIONS.map((r) => r.apiHost);

/** Resolve a region key to its definition, refusing an unknown one by name. */
export function regionFor(region: unknown): ZuoraRegion {
  const key = String(region ?? "us-cloud2").trim() || "us-cloud2";
  const found = REGIONS_BY_KEY[key];
  if (!found) {
    throw new Error(
      `unknown Zuora region \`${key}\` — expected one of: ${REGIONS.map((r) => r.key).join(", ")}`,
    );
  }
  return found;
}

/** `https://<host>` for a region key. */
export function hostFor(region: unknown): string {
  return `https://${regionFor(region).apiHost}`;
}

/** The API origin for a connection, defaulting to US Production (Cloud 2). */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { region?: string };
  return hostFor(display.region);
}

/** What may be sent as an Object Query `filter[]` / `sort[]` / `expand[]` value. */
export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, QueryValue>;
  /** Repeated `filter[]=field.OP:value` clauses. Object Query ANDs them; there is no OR. */
  filters?: string[];
  body?: unknown;
}

/** One page of an Object Query list (`{data: [...], nextPage}`). */
export interface Page<T> {
  items: T[];
  nextPage?: string;
}

/** Drop keys the caller left unset, so an optional field is absent rather than `""`/`null`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field (e.g. a `filter` param) into a trimmed list. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Turn a Zuora error body into something actionable. Handles both the classic
 * `/v1/*` shape (`{success, processId, reasons}`) and the Object Query shape
 * (`{reasons, requestId}`) — see the module doc above.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 500);
  try {
    const body = JSON.parse(text) as {
      reasons?: Array<{ code?: number; message?: string }>;
      message?: string;
      error?: string;
      error_description?: string;
    };
    if (Array.isArray(body?.reasons) && body.reasons.length > 0) {
      detail = body.reasons
        .map((r) => (r.code ? `[${r.code}] ${r.message}` : r.message))
        .filter(Boolean)
        .join("; ");
    } else {
      detail = body?.message ?? body?.error_description ?? body?.error ?? detail;
    }
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail} — the bearer token may have expired or been rejected. Zuora tokens are ` +
      "short-lived; this app mints a new one on `refresh` rather than relying on a refresh token " +
      "(Zuora's client-credentials grant issues none)";
  }
  if (status === 429) {
    return `${detail} — rate or concurrency limited. Zuora enforces per-minute/hour/day request ` +
      "limits AND a separate concurrent-request limit (40 by default, 80 for Object Query) per " +
      "tenant; check the `ratelimit-*` response headers to tell which one was hit";
  }
  return detail || `${status}`;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes
 * every request through the auth `sign` hook.
 */
export class ZuoraClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    for (const f of options.filters ?? []) {
      url.searchParams.append("filter[]", f);
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Zuora ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * One page of an `/object-query/*` list — Zuora's only endpoints with real,
   * generic filtering + cursor pagination (see the module doc's "Two response
   * shapes" section for why every list action here goes through this surface
   * rather than the classic `/v1/*` per-resource endpoints).
   */
  async page<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    const body = await this.request<{ data?: T[]; nextPage?: string | null }>(
      `/object-query${path}`,
      options,
    );
    return {
      items: Array.isArray(body?.data) ? body.data : [],
      nextPage: body?.nextPage ?? undefined,
    };
  }

  /**
   * Follow `nextPage` to the end, or until `wantTotal` rows. Zuora caps
   * `pageSize` at 99 (a value outside 1-99 is a 400, not a clamp).
   */
  async pageAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
    maxPages = 20,
  ): Promise<Page<T>> {
    const items: T[] = [];
    let cursor: string | undefined;
    let pages = 0;

    while (items.length < wantTotal && pages < maxPages) {
      const pageSize = Math.min(99, Math.max(1, wantTotal - items.length));
      const page = await this.page<T>(path, {
        ...options,
        query: {
          ...options.query,
          pageSize: Number.isFinite(wantTotal) ? pageSize : 99,
          cursor,
        },
      });
      items.push(...page.items);
      pages += 1;
      if (!page.nextPage) return { items: items.slice(0, wantTotal), nextPage: undefined };
      cursor = page.nextPage;
    }

    return {
      items: Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items,
      nextPage: cursor,
    };
  }
}
