import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Insightly's REST API — verified against `api.na1.insightly.com/v3.1/help`
 * (the live Swagger help page for the v3.1 API) and its underlying OpenAPI
 * document at `/v3.1/swagger/docs/v3.1`, fetched 2026-09-05.
 *
 * **Every account lives on a regional "pod".** Insightly's own docs state it
 * plainly: "The API is accessible via the following URL:
 * `https://api.{pod}.insightly.com/v3.1/`... Your instance's pod can be
 * determined by accessing 'User Settings' and finding the API URL right
 * under your API Key." `api.insightly.com` itself (no pod) answers the
 * static `/v3.1/help` page but 404s on every real resource path — confirmed
 * live: `GET https://api.insightly.com/v3.1/Contacts` -> 404, while
 * `GET https://api.na1.insightly.com/v3.1/Contacts` -> 401 (the documented
 * "Authorization has been denied" body, i.e. a real, reachable endpoint). A
 * manifest cannot enumerate every pod, so `w6w.network.allow` declares the
 * wildcard `*.insightly.com`, and the pod is a field collected on the
 * Connection (like Freshdesk's and Gorgias's subdomain) rather than an
 * Action param.
 *
 * A pod that does not exist is not a 404 from Insightly — the hostname
 * itself does not resolve (verified: `api.<made-up-pod>.insightly.com`
 * fails DNS resolution, it does not reach any Insightly server). That is why
 * `health/pod.ts` treats a thrown fetch error as "wrong pod", distinct from
 * a 5xx.
 */
export const API_VERSION = "v3.1";

/** Public (redacted-safe) connection metadata this app records. */
export interface InsightlyConnectionDisplay {
  /** The pod segment, e.g. `na1`. */
  pod?: string;
  /** `FIRST_NAME LAST_NAME` of the user the API key belongs to. */
  name?: string;
  email?: string;
}

/** Build the versioned API root for a pod, e.g. `na1` -> `https://api.na1.insightly.com/v3.1`. */
export function baseUrl(pod: string): string {
  return `https://api.${pod}.insightly.com/${API_VERSION}`;
}

/** Read the pod off the redacted Connection. Never touches the credential. */
export function podFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as InsightlyConnectionDisplay;
  if (display.pod) return display.pod;
  throw new Error(
    "this Insightly connection records no pod — reconnect it so the pod can be recorded",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Insightly's documented error envelope — verified live against an
 * unauthenticated call: `{"Message":"Authorization has been denied for this
 * request."}`. A response that doesn't parse as JSON, or that parses but
 * carries no `Message`, falls back to the raw body so a shape change never
 * surfaces as "undefined".
 */
export function errorMessage(text: string): string {
  if (!text) return "";
  try {
    const body = JSON.parse(text) as { Message?: string };
    if (typeof body.Message === "string") return body.Message;
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return text;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class InsightlyClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(podFromConnection(ctx.connection));
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      const detail = errorMessage(text);
      throw new Error(
        `Insightly ${res.status} ${res.statusText} for ${init.method} ${url.pathname}` +
          (detail ? `: ${detail}` : ""),
      );
    }
    // DELETE succeeds with 202 and an empty body.
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
