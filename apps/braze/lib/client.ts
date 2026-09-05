import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Braze's REST API — verified against the community-maintained OpenAPI
 * document Braze itself points partners at
 * (`braze-community/braze-specification`, `openapi/spec.json`, 575,410 bytes,
 * fetched 2026-09-05, `info.title` "Braze Endpoints"). That document is built
 * from Braze's own official Postman collection, not a third-party guess.
 *
 * ## There is no single Braze API host
 *
 * Braze runs each customer's workspace on one of several fixed regional
 * clusters, and a REST key is only valid against the cluster it was issued
 * on. The fetched spec's own `servers[]` array names exactly nine of them —
 * seven in the US and two in the EU, and **the EU pair is on a different
 * apex domain** (`braze.eu`, not `braze.com`):
 *
 *   rest.iad-01.braze.com   rest.iad-02.braze.com   rest.iad-03.braze.com
 *   rest.iad-04.braze.com   rest.iad-05.braze.com   rest.iad-06.braze.com
 *   rest.iad-08.braze.com
 *   rest.fra-01.braze.eu    rest.fra-02.braze.eu
 *
 * Braze's own status page (`status.braze.com`, a real Statuspage instance —
 * `page.name` is "Braze, Inc.") lists more clusters than the spec's servers
 * array does (AU-01, ID-01, JP-01, KR-01, plus a US-07/US-10), but the spec
 * gives no REST hostname for any of them, so this app cannot reach them
 * without inventing a hostname the primary source never states. It supports
 * exactly the nine the spec names; an account on one of the others is out of
 * scope until Braze's own OpenAPI document adds it.
 *
 * The instance is therefore a **Connection field**, not a per-request
 * parameter or a guess: the customer reads it straight off their own
 * dashboard URL (`dashboard-01.braze.com`, `dashboard-02.braze.com`, …), and
 * a key from one instance simply fails — as an ordinary 401 — against any
 * other. This mirrors the `apps/jumpcloud` app's `region` field for the same
 * reason: JumpCloud also runs several fixed regional consoles and asks for
 * the choice rather than discovering it.
 */

/** The nine REST hosts the fetched OpenAPI spec's `servers[]` enumerates. */
export const INSTANCES = {
  "iad-01": { host: "rest.iad-01.braze.com", label: "US-01" },
  "iad-02": { host: "rest.iad-02.braze.com", label: "US-02" },
  "iad-03": { host: "rest.iad-03.braze.com", label: "US-03" },
  "iad-04": { host: "rest.iad-04.braze.com", label: "US-04" },
  "iad-05": { host: "rest.iad-05.braze.com", label: "US-05" },
  "iad-06": { host: "rest.iad-06.braze.com", label: "US-06" },
  "iad-08": { host: "rest.iad-08.braze.com", label: "US-08" },
  "fra-01": { host: "rest.fra-01.braze.eu", label: "EU-01" },
  "fra-02": { host: "rest.fra-02.braze.eu", label: "EU-02" },
} as const;

export type Instance = keyof typeof INSTANCES;

export const DEFAULT_INSTANCE: Instance = "iad-01";

/** Public (redacted-safe) connection metadata this app publishes. */
export interface BrazeConnectionDisplay {
  instance?: Instance;
}

/**
 * Resolve the instance a Connection was set up against. Falls back to US-01,
 * the spec's own first-listed and most commonly referenced instance, when the
 * Connection carries nothing usable — this only happens for a malformed
 * Connection, since the field is required at connect time.
 */
export function resolveInstance(connection: RedactedConnection | undefined): Instance {
  const display = (connection?.display ?? {}) as BrazeConnectionDisplay;
  const instance = String(display.instance ?? DEFAULT_INSTANCE);
  return (instance in INSTANCES ? instance : DEFAULT_INSTANCE) as Instance;
}

export function hostFor(instance: Instance): string {
  return INSTANCES[instance].host;
}

export function apiUrl(instance: Instance): string {
  return `https://${hostFor(instance)}`;
}

/**
 * Braze's own error envelope (`components.schemas.Error` in the fetched spec,
 * reused verbatim by every documented 400/401/403/404/429/500 response):
 * `{ message?: string, errors?: string[] }`. Never the HTTP status alone —
 * some Braze endpoints (`/leads/describe.json`-style envelopes exist on other
 * vendors, not this one, but the same discipline applies) answer 200 with a
 * failure recorded only in the body, so callers here read this body first and
 * treat the status as a hint.
 */
export interface BrazeError {
  message?: string;
  errors?: string[];
}

export async function readBrazeError(res: Response): Promise<string> {
  const body = await res.clone().json().catch(() => null) as BrazeError | null;
  const parts = [body?.message, ...(body?.errors ?? [])].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : `HTTP ${res.status}`;
}

/** Thin request helper: resolves the instance, signs nothing (that's `sign`'s job), parses JSON. */
export class BrazeClient {
  constructor(private ctx: HookContext) {}

  get instance(): Instance {
    return resolveInstance(this.ctx.connection);
  }

  url(path: string, query?: Record<string, unknown>): string {
    const u = new URL(path, apiUrl(this.instance));
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        // Braze's array-valued query params (e.g. `phone_numbers[]=...`) repeat
        // the key with a `[]` suffix rather than comma-joining, per the fetched
        // spec's example requests.
        if (Array.isArray(v)) {
          for (const item of v) u.searchParams.append(`${k}[]`, String(item));
        } else {
          u.searchParams.set(k, String(v));
        }
      }
    }
    return u.toString();
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options: { query?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const res = await this.ctx.fetch(this.url(path, options.query), {
      method,
      headers: options.body !== undefined ? { "content-type": "application/json" } : {},
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`Braze ${method} ${path} failed: ${await readBrazeError(res)}`);
    }
    if (res.status === 204) return undefined as T;
    return await res.json() as T;
  }

  get<T = unknown>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  post<T = unknown>(path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>("POST", path, { query, body: body ?? {} });
  }
}
