import type { HookContext } from "@w6w/types";

/**
 * Sendblue REST client.
 *
 * Verified 2026-08-25 against Sendblue's own documentation portal
 * (`docs.sendblue.com`) — the hand-authored `api-v2/*` guide pages plus the
 * SDK-generated `api/resources/*` reference (Stainless, built from Sendblue's
 * own OpenAPI document) — and live probes against the API host. Nothing here
 * came from a third-party integration directory.
 *
 * ## The host is `api.sendblue.co`, not `.com` — the docs disagree with themselves
 *
 * Every code sample in the SDK-generated reference (`api/resources/*`, the
 * more likely to be spec-derived of the two doc trees) calls
 * `https://api.sendblue.co/...`. The hand-authored guide pages
 * (`api-v2/messages`, `getting-started/*`, `api-v2/subaccounts`, …) just as
 * consistently call `https://api.sendblue.com/...` instead. Both hosts answer
 * identically live (measured: an unauthed `POST /api/send-message` returns the
 * same `403 {"message":"Did not get inputs for authorization"}` on both), but
 * DNS tells them apart: `api.sendblue.co` is a direct CNAME to
 * `gr-production-alb-*.us-east-2.elb.amazonaws.com` — the production origin —
 * while `api.sendblue.com` resolves to Cloudflare's anycast network sitting in
 * front of it. `.co` is used here as the canonical host because it is what
 * every machine-generated example names and it points straight at the origin;
 * `.com` is very likely a CDN-fronted alias of the same backend, but that is
 * inference, not something either doc tree states outright. A caller who
 * copy-pasted a `getting-started` example and later hit a `.co`-only quirk
 * (or vice versa) would have no way to know these were ever the same service.
 *
 * ## Four different path shapes coexist on one host
 *
 * There is no single `/api/v2` convention here — the *same* resource area
 * mixes vintages:
 *
 *  - Bare, unversioned: `/api/send-message`, `/api/status`, `/api/upload-media-object`,
 *    `/api/send-reaction`, `/api/mark-read`, `/api/request-location`, `/api/location`.
 *  - Legacy singular: `DELETE /api/message/:message_handle` — deleting a
 *    message has NO `/v2` form; every other message operation does.
 *  - `/api/v2/*`: messages list/get, contacts, seats, webhooks (`/api/account/webhooks`
 *    is the odd one out even inside this tier — no `/v2`), TOTP, Verify
 *    Services/Verifications, line state, events.
 *  - `/v3/*` (no `/api` at all): verified contacts (`/v3/verified-contacts`)
 *    and temporary bearer tokens (`/v3/auth/tokens`).
 *
 * Guessing a `/v2` (or lack of one) from a sibling endpoint's shape is the
 * single most common way to build a broken request against this API — every
 * path below was confirmed individually against a worked example, not
 * inferred from the resource name.
 *
 * ## Errors are usually `{"status":"ERROR","message":...}` — but not always
 *
 * Most endpoints answer a failure as `{"status": "ERROR", "message": "..."}`
 * with a 4xx/5xx status. The one confirmed exception is a *missing*
 * credential, which 403s with `{"message": "Did not get inputs for
 * authorization"}` and no `status` field at all — live-probed 2026-08-25. A
 * *wrong* (but present) credential pair 401s with the ordinary
 * `{"status":"ERROR","message":"Invalid Credentials"}` shape. `auth/api-keys.ts`
 * tells the two apart by body, not by status code.
 */

/** The origin every machine-generated Sendblue code sample calls. See module docs. */
export const API_BASE = "https://api.sendblue.co";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  /**
   * `unknown` rather than `QueryValue` so a caller can hand `compact(...)`'s
   * `Record<string, unknown>` straight through — every value is stringified
   * (or dropped, if `undefined`/`null`/`""`) when the URL is built.
   */
  query?: Record<string, unknown>;
  body?: unknown;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

interface SendblueErrorBody {
  status?: string;
  message?: string;
  error?: string;
  detail?: string;
}

/** Drop keys the caller left unset. `false` and `0` survive — both can be meaningful. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Turn Sendblue's error body into one actionable line. Handles the two documented shapes. */
export function formatSendblueError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: SendblueErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as SendblueErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.message ?? parsed?.error ?? parsed?.detail;
  if (!message) {
    return `Sendblue ${status} for ${method} ${path}: ${raw.slice(0, 500)}`;
  }
  return `Sendblue ${status} for ${method} ${path}: ${message}`;
}

export class SendblueClient {
  constructor(private ctx: HookContext) {}

  async get<T = unknown>(path: string, query?: Record<string, unknown>): Promise<T> {
    return await this.request<T>(path, { method: "GET", query });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.request<T>(path, { method: "POST", body });
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.request<T>(path, { method: "PUT", body });
  }

  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    return await this.request<T>(path, { method: "DELETE", body });
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatSendblueError(res.status, init.method ?? "GET", url.pathname, text));
    }
    // A few endpoints (DELETE .../verify/services/:sid) answer 204 with no body.
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Sendblue returned a non-JSON body for ${init.method} ${url.pathname}`);
    }
  }
}
