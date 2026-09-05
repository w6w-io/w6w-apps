import type { HookContext } from "@w6w/types";

/**
 * Ontraport API v1 REST client.
 *
 * Verified on 2026-09-05 against Ontraport's own reference at
 * `https://api.ontraport.com/doc/` (a Slate-generated document, 2,760,600
 * bytes, `<title>Ontraport API</title>`) plus live probes against
 * `api.ontraport.com`.
 *
 * ## One host, one version prefix
 *
 * Every documented endpoint is `https://api.ontraport.com/1/...`. There is no
 * per-tenant subdomain — a single App ID + API Key pair addresses one
 * Ontraport account, and the account is identified entirely by those two
 * headers, never by the host.
 *
 * ## The generic Object model, and why most of this app avoids it
 *
 * Every Ontraport record — a contact, a task, a tag, an order — is an
 * instance of a numbered **object type** (see {@link OBJECT_TYPE}). The API
 * exposes this two ways:
 *
 *  - a **generic** family, `/objects` and `/object`, that takes an `objectID`
 *    (or, on two endpoints, `object_type_id` — the doc is not consistent
 *    about the parameter's own name) query/body parameter and works on any
 *    object type the account has;
 *  - **dedicated** per-object endpoints (`/Contact(s)`, `/Task(s)`,
 *    `/Tags`, `/Order(s)`, `/Transaction(s)`, `/Purchase(s)`,
 *    `/CampaignBuilderItem(s)`) that need no `objectID` at all, because the
 *    object type is baked into the path.
 *
 * This app uses the **dedicated** endpoints wherever one exists — they are
 * shorter, need one less parameter, and are what the doc leads with for every
 * object this app covers. The generic family is used only for the two
 * operations that are inherently cross-object: tagging/untagging an object by
 * name ({@link OBJECT_TYPE} still has to say *which* kind of object is being
 * tagged), and Sequences, which have no dedicated endpoint of their own at
 * all.
 *
 * ## Permissions are per object type, and they are not uniform
 *
 * Ontraport's own "Accessible Objects" table (read structurally, not by
 * skimming) grants a different subset of GET/PUT/POST/DELETE per object type.
 * The one that costs the most time: **Task (object type 1) has no POST and no
 * DELETE** — there is no "create a task" or "delete a task" endpoint anywhere
 * in the reference, matching the missing table cell exactly. This app
 * therefore has no `task-create` or `task-delete` action; see `auth/` and the
 * task actions' own comments.
 *
 * ## Two ways the "always JSON" claim in the doc is false
 *
 * The doc states "All responses will be JSON-encoded regardless of request
 * method." Measured live on 2026-09-05, that is false for the one response
 * every Connection eventually produces: **an authentication failure answers
 * `401` with `content-type: text/html` and the plain-text body
 * `"Your App ID and API Key do not authenticate."`** — no `code`, no `data`,
 * no JSON at all, and identical whichever of the two headers is missing or
 * wrong. A client that assumes `res.json()` always succeeds throws on the
 * exact response it most needs to classify cleanly. See
 * {@link isAuthFailureBody} and {@link formatOntraportError}.
 *
 * ## The envelope, on the ok path
 *
 * A successful call answers `{"code": 0, "data": ..., "account_id": ...}`,
 * plus a top-level `"count"` (a STRING) when the request asked for one and a
 * `"misc"` array on collection reads. {@link OntraportClient.data} unwraps
 * `data`; {@link OntraportClient.list} additionally surfaces `count`.
 *
 * ## Two request-body encodings, chosen per endpoint by the doc, not by verb
 *
 * Most POST/PUT bodies are `application/x-www-form-urlencoded`, but a few
 * (generic object create/update, `tagByName`) are `application/json`. Both
 * are supported via {@link RequestOptions.body} (JSON) and
 * {@link RequestOptions.form} (URL-encoded); each action picks the one its
 * endpoint documents.
 */

/** The one and only API origin. */
export const API_BASE = "https://api.ontraport.com";

/** Every documented endpoint carries this version prefix. */
export const API_PREFIX = "/1";

/**
 * `GET /1/Contacts/getInfo` — count only, no contact data, needs a live
 * credential. Shared by the Auth `test` hook (the credential-liveness probe)
 * and the `quota` health check (the same call carries the
 * `X-Rate-Limit-*` headers) — one constant so neither can drift onto a
 * different endpoint. See `auth/api-key.ts` for the full reasoning.
 */
export const CREDENTIAL_PROBE_PATH = "/Contacts/getInfo";

/**
 * Object type IDs, read off the "Accessible Objects" table in the reference
 * doc. Only the ones this app's generic-endpoint actions (tagging, sequences)
 * actually send are included — the full table has ~60 entries and is
 * reproduced in `README.md` for anyone extending this app.
 */
export const OBJECT_TYPE = {
  CONTACT: 0,
  TASK: 1,
  USER: 2,
  GROUP: 3,
  SEQUENCE: 5,
  RULE: 6,
  TAG: 14,
  PURCHASE: 17,
  OPEN_ORDER: 44,
  CREDIT_CARD: 45,
  TRANSACTION: 46,
  ORDER: 52,
  CAMPAIGN: 75,
  CAMPAIGN_BUILDER: 140,
} as const;

export type QueryValue = string | number | boolean | undefined | null | string[] | number[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** JSON-encoded body, sent with `content-type: application/json`. */
  body?: unknown;
  /**
   * URL-encoded body, sent with `content-type: application/x-www-form-urlencoded`.
   * Loosely typed on purpose — an `extraFields` passthrough param can carry any
   * JSON-shaped value (a nested object for a custom field, an array of tag
   * option ids); non-primitive values are JSON-stringified before encoding.
   */
  form?: Record<string, unknown>;
}

/** The envelope every successful call answers with. */
export interface OntraportEnvelope<T> {
  code?: number;
  data?: T;
  account_id?: string | number;
  /** Present on collection reads. */
  misc?: unknown[];
  /** Present when the request asked for a count. A string, per the vendor. */
  count?: string;
}

/**
 * The fixed sentence Ontraport answers with — as plain text, `content-type:
 * text/html` — when the `Api-Key` / `Api-Appid` pair does not authenticate.
 * Confirmed live and identical whether the key, the App ID, or both are
 * missing or wrong; there is no vendor error *code* to key off, only this
 * prose, so classification here is necessarily a text match rather than a
 * structured field.
 */
export const AUTH_FAILURE_TEXT = "do not authenticate";

/** Does this response body say the credential pair failed? */
export function isAuthFailureBody(text: string): boolean {
  return text.toLowerCase().includes(AUTH_FAILURE_TEXT);
}

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Normalise a `multiselect`/repeat param into a comma-joined list, as every list endpoint expects. */
export function toCommaList(
  v: string[] | number[] | string | undefined | null,
): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = Array.isArray(v) ? v : String(v).split(",");
  const trimmed = items.map((s) => String(s).trim()).filter(Boolean);
  return trimmed.length ? trimmed.join(",") : undefined;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Render a boolean the way Ontraport's examples do: `"1"` present, absent otherwise. */
export function flag(v: boolean | undefined): string | undefined {
  return v === true ? "1" : undefined;
}

/**
 * Turn an Ontraport failure response into one actionable line.
 *
 * Handles both shapes seen on the wire: the documented JSON envelope (which a
 * non-2xx response MAY still carry) and the plain-text auth-failure sentence
 * (which never is JSON). Never throws on an unparsable body — the raw text is
 * itself the most useful thing to show when nothing structured is present.
 */
export function formatOntraportError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  if (isAuthFailureBody(raw)) {
    return `Ontraport ${status} for ${method} ${path}: the App ID / API Key pair does not ` +
      "authenticate";
  }
  try {
    const parsed = JSON.parse(raw) as { code?: number; data?: unknown; message?: string };
    const detail = parsed.message ?? (parsed.data !== undefined ? JSON.stringify(parsed.data) : "");
    return `Ontraport ${status} for ${method} ${path}${detail ? `: ${detail}` : ""}`;
  } catch {
    const truncated = raw.length > 500
      ? `${raw.slice(0, 500)}… (${raw.length} bytes truncated)`
      : raw;
    return `Ontraport ${status} for ${method} ${path}${truncated ? `: ${truncated}` : ""}`;
  }
}

export class OntraportClient {
  constructor(private ctx: HookContext) {}

  /** Unwraps `{"data": ...}`. The shape of every endpoint this app calls. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.envelope<T>(path, options);
    return body.data as T;
  }

  /** Like {@link data}, but also returns the top-level `count` when present. */
  async list<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ items: T[]; count?: number }> {
    const body = await this.envelope<T[]>(path, options);
    const items = Array.isArray(body.data) ? body.data : [];
    return { items, count: body.count !== undefined ? Number(body.count) : undefined };
  }

  /** The parsed envelope, unwrapped no further. Exposes `account_id` for the rare caller that needs it. */
  async envelope<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<OntraportEnvelope<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text) as OntraportEnvelope<T>;
  }

  /** Status only — used by the handful of endpoints whose success body is a bare string, not an object. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    // Default to POST whenever a body is present and the caller didn't say
    // otherwise — every create endpoint in this app sends a body without
    // spelling out the verb, matching the doc's own curl examples.
    const defaultMethod = options.body !== undefined || options.form !== undefined ? "POST" : "GET";
    const init: RequestInit = { method: options.method ?? defaultMethod, headers };

    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    } else if (options.form !== undefined) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) form.set(k, v.join(","));
        else if (typeof v === "object") form.set(k, JSON.stringify(v));
        else form.set(k, String(v));
      }
      init.body = form.toString();
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatOntraportError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
