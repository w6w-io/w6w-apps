import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * All Crisp REST API v1 resources live under a single host.
 *
 * Verified against `docs.crisp.chat/references/rest-api/v1/` (fetched 2026-09-01):
 * every endpoint in the reference resolves as `https://api.crisp.chat/v1/...`, and
 * `guides/rest-api/authentication/website-token/`'s own worked cURL example targets
 * the same host.
 */
export const API_HOST = "https://api.crisp.chat";
export const API_V1 = `${API_HOST}/v1`;

/**
 * The `X-Crisp-Tier` header Crisp requires ALONGSIDE `Authorization: Basic` for a
 * Website Token — omitting it is not a soft failure, it changes how the API reads
 * the credential. Verbatim from `guides/rest-api/authentication/website-token/`:
 *
 *   "Also, include the X-Crisp-Tier header in your HTTP requests, with the value
 *   website. This lets the REST API know that the token you are using is a
 *   website token."
 *
 * This app implements Website Token auth only (see `auth/basic.ts`), so the value
 * is a fixed constant rather than something derived per credential.
 */
export const TIER_HEADER_VALUE = "website";

/**
 * Every v1 response — success or error — is wrapped in this envelope. Verified
 * against the reference's embedded worked examples (e.g. "Get Website
 * Information"'s `200 OK` sample: `{"error": false, "reason": "resolved", "data":
 * {...}}`, and its `403`/`404`/`406` samples: `{"error": true, "reason":
 * "not_allowed", "data": {}}`). `reason` is a short machine token, not prose.
 */
export interface CrispEnvelope<T = unknown> {
  error: boolean;
  reason?: string;
  data?: T;
}

/** Render a vendor error body for a human without ever echoing request material. */
export function formatError(status: number, body: CrispEnvelope | undefined): string {
  if (!body) return `HTTP ${status}`;
  return body.reason ? `HTTP ${status}: ${body.reason}` : `HTTP ${status}`;
}

/**
 * A Website Token is scoped to exactly one workspace, and that workspace's
 * `website_id` is a path segment on every single v1 resource
 * (`/v1/website/{website_id}/...`) — it is not something the credential alone
 * lets an Action derive, since Actions never see the credential. So `website_id`
 * is collected as a non-secret Auth field (see `auth/basic.ts`) and echoed by
 * `afterConnect` onto the Connection's display data, exactly the pattern
 * `apps/gorgias` uses for its per-account subdomain.
 */
export function websiteIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { websiteId?: string };
  if (display.websiteId) return display.websiteId;
  throw new Error(
    "Crisp connection has no website id — reconnect the workspace so it can be recorded.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`, scoped to this Connection's workspace. Sets
 * `accept` and the fixed `X-Crisp-Tier: website` header on every call, but never
 * `Authorization` — the runtime routes each request through the auth `sign`
 * hook, the only code in this app that sees the credential.
 */
export class CrispClient {
  private websiteId: string;

  constructor(private ctx: HookContext) {
    this.websiteId = websiteIdFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const target = new URL(`${API_V1}/website/${encodeURIComponent(this.websiteId)}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      target.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      "x-crisp-tier": TIER_HEADER_VALUE,
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(target.toString(), init);
    const text = await res.text();
    let parsed: CrispEnvelope<T> | undefined;
    try {
      parsed = text ? (JSON.parse(text) as CrispEnvelope<T>) : undefined;
    } catch {
      // Non-JSON body — formatError falls back to the status alone.
    }

    if (!res.ok || parsed?.error) {
      throw new Error(
        `Crisp ${init.method} ${target.pathname} returned ${formatError(res.status, parsed)}`,
      );
    }
    return (parsed?.data as T) ?? (undefined as T);
  }
}

/** Reusable param descriptors for the `page_number` + `per_page` pagination Crisp uses on list endpoints. */
export const PAGE_PARAMS = [
  {
    key: "pageNumber",
    label: "Page number",
    type: "number" as const,
    default: 1,
    required: true,
    hint: "1-indexed. Every Crisp list endpoint paginates by page number, not offset.",
  },
];

/** Drop `undefined` / empty-string values so optionals never overwrite vendor defaults. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "") continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}

/** Crisp's list-endpoint boolean filters are `1`/`0` query strings, not `true`/`false`. */
export function bitFlag(v: boolean | undefined): 1 | 0 | undefined {
  return v === undefined ? undefined : v ? 1 : 0;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}
