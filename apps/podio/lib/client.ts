import type { HookContext } from "@w6w/types";

/**
 * Podio API client.
 *
 * Everything in this module was verified on 2026-08-11 against Podio's own
 * reference at `developers.podio.com/doc` (a 19,167-byte index linking one page
 * per operation), against Podio's own current PHP client
 * (`github.com/podio/podio-php`, `lib/PodioClient.php`, `VERSION = '7.0.0'`),
 * and against live probes of `api.podio.com`. Nothing came from a third-party
 * integration directory.
 *
 * ## One host, no version prefix
 *
 * `https://api.podio.com`, and paths carry no version segment — `/item/{id}`,
 * `/app/{id}`, `/org/`. The vendor's own client hard-codes
 * `https://api.podio.com:443` as its only default. There is no regional host
 * and no sandbox environment, so nothing about the host is derived from the
 * credential.
 *
 * A handful of endpoints carry a `/v2` *suffix* rather than a prefix
 * (`/item/{id}/value/v2`, `/search/v2`). This app does not use any of them; see
 * `index.ts` for why.
 *
 * ## Requests are JSON; the token endpoints are not
 *
 * Every ordinary API call sends and receives `application/json`
 * (`PodioClient.php` line 235/246). The OAuth token endpoints are the
 * exception, and they are covered in `auth/app-auth.ts` — the split is
 * important enough to have its own write-up there.
 *
 * ## Errors
 *
 * Every failure is a flat JSON envelope, identical in shape across 400/401/403/
 * 404/409 (measured):
 *
 * ```json
 * {"error":"unauthorized","error_detail":null,"error_description":"expired_token",
 *  "error_parameters":{},"error_propagate":false,
 *  "request":{"url":"/user/status","method":"GET","query_string":""}}
 * ```
 *
 * `error` is the machine code and `error_description` is a *second* machine
 * code rather than prose (`expired_token`, `invalid_request`,
 * `oauth.client.invalid_id`), which is why {@link formatPodioError} surfaces
 * both verbatim. Flattening them into "HTTP 401" throws away the only field
 * that distinguishes "no credential reached Podio" from "Podio rejected the
 * credential" — see {@link classifyAuthFailure}.
 */

/** The one and only API origin. The vendor's own client declares no other. */
export const API_BASE = "https://api.podio.com";

/**
 * The status Podio returns when it is throttling — **420**, not 429.
 *
 * Nowhere in `developers.podio.com`; taken from the vendor's own client, whose
 * status switch reads `case 420: throw new PodioRateLimitError(…)`. Named here
 * so the one place that formats an error can say so, because a generic retry
 * policy watching for 429 will sit through a throttle without noticing.
 */
export const THROTTLED_STATUS = 420;

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** Podio's flat error envelope. Every non-2xx response has this shape. */
export interface PodioErrorBody {
  error?: string;
  error_detail?: string | null;
  error_description?: string;
  error_parameters?: Record<string, unknown>;
  error_propagate?: boolean;
  request?: { url?: string; method?: string; query_string?: string };
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `silent=false`, `hook=false` and `offset=0` are all
 * meaningful, and dropping them would make them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Render a boolean query parameter.
 *
 * Podio's own documented defaults are spelled `true` / `false` in prose, and
 * the vendor's client sends them as literal strings, so both values are
 * expressible. Unlike some APIs, `false` here is *not* the same as absence:
 * `?silent=false` and no `silent` at all happen to coincide today, but
 * `?hook=false` differs from the documented `hook` default of `true`.
 */
export function flag(v: boolean | undefined): string | undefined {
  return v === undefined || v === null ? undefined : v ? "true" : "false";
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site. This matters more in this app
 * than in most: item field values are user-defined and therefore *always*
 * arrive through a `json` param.
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

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/**
 * Require a JSON *object* (not an array, not a scalar).
 *
 * `fields`, `filters` and `settings` are all keyed maps in Podio's request
 * schemas. Handing an array through would be accepted by `JSON.parse` and then
 * silently ignored by Podio, which is the worst possible failure — the call
 * succeeds and writes nothing.
 */
export function asJsonObject(value: unknown, label: string): Record<string, unknown> {
  const parsed = asJson<unknown>(value, label);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object keyed by field id or external id`);
  }
  return parsed as Record<string, unknown>;
}

/** Normalise a `multiselect` / comma-string param into a list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied id or reference segment.
 *
 * Podio ids are numeric, but two path segments are not: `external_id` on
 * `/item/app/{app_id}/external_id/{external_id}` is a string chosen by whoever
 * imported the data, and `ref_type` on `/comment/{type}/{id}/` is a vocabulary
 * word. Both are escaped so a `/` or `?` pasted into a form cannot rewrite the
 * path.
 */
export function encodeSegment(value: string | number): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/**
 * Fields deleted from an entity before an Action returns.
 *
 * This is not tidiness. Each one is live, credential-grade material that Podio
 * hands back inside an otherwise ordinary read:
 *
 *  - **`token` on `GET /app/{app_id}`** is documented, in the vendor's own
 *    words, as "The app token to use when logging in as an app". It is exactly
 *    the `app_token` half of the App Authentication grant this app implements
 *    in `auth/app-auth.ts`. Paired with a client id and secret — which any
 *    Podio user can mint for free at podio.com/settings/api — it mints access
 *    tokens for that app indefinitely. Returning it would let one `read` action
 *    turn into a permanent, unrevoked write credential sitting in a workflow's
 *    run record.
 *  - **`push` on an item, task or file** is `{channel, signature, timestamp}` —
 *    a signed subscription grant for Podio's realtime push channel. It is a
 *    bearer capability for that object's event stream, it is useless to a
 *    workflow (nothing here speaks that protocol), and it changes on every
 *    read, which would make otherwise-identical results compare unequal.
 *
 * A workflow step's result is persisted in the run record and is routinely
 * echoed into logs, other apps and human-readable previews, so returning either
 * would turn one read into a durable credential leak. They are deleted rather
 * than masked: a masked placeholder in a field named `token` reads like a
 * value, and something downstream will try to use it.
 *
 * Both remain available to their owner in Podio itself. Nothing else about the
 * response is altered.
 */
export const REDACTED_FIELDS = ["token", "push"] as const;

/**
 * Remove {@link REDACTED_FIELDS} from an entity, returning a shallow copy.
 *
 * Deliberately narrow — it deletes two exactly-named top-level keys and
 * nothing else. A heuristic that ate anything *looking* secret would corrupt
 * user data, because in this app the payload is a user-defined record: a Podio
 * app can perfectly well have a field whose external id is `token`, and that
 * field's values live under `fields`, not at the top level.
 */
export function stripSecrets<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out.token;
  delete out.push;
  return out as T;
}

/** {@link stripSecrets} over a list, tolerating a non-array. */
export function stripSecretsAll<T>(entities: T[]): T[] {
  return Array.isArray(entities) ? entities.map((e) => stripSecrets(e)) : entities;
}

/**
 * Turn Podio's error envelope into one actionable line.
 *
 * Both machine codes are kept. `error` is the class of failure
 * (`unauthorized`, `invalid_client`, `invalid_value`, `not_found`) and
 * `error_description` is the specific reason (`expired_token`,
 * `invalid_request`, `must be object`) — and for the auth failures they are the
 * only thing that separates two problems with two different fixes. See
 * {@link classifyAuthFailure}.
 *
 * The message can carry only Podio's own strings and the caller's own input;
 * the credential never enters this module.
 */
export function formatPodioError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: PodioErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PodioErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.error) return `Podio ${status} for ${method} ${path}: ${truncate(raw)}`;

  const parts = [
    `Podio ${status} ${parsed.error} for ${method} ${path}`,
    parsed.error_description,
    parsed.error_detail ?? undefined,
    status === 409
      ? "the item changed since the revision you supplied; re-read it and retry"
      : undefined,
    // Podio throttles with 420, not 429 — from its own client's status switch
    // (`case 420: throw new PodioRateLimitError`). A retry policy watching for
    // 429 never fires here, so the status is named in the message instead.
    status === THROTTLED_STATUS ? "Podio is throttling this client; back off and retry" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * What kind of auth failure this is, decided from the response **body**.
 *
 * Podio answers **401 for both** "you sent no credential" and "the credential
 * is no good" — byte-identical apart from one field, measured on
 * `GET /user/status` on 2026-08-11:
 *
 *   | Request                          | Status | `error`        | `error_description` |
 *   | -------------------------------- | ------ | -------------- | ------------------- |
 *   | no `Authorization` header        | 401    | `unauthorized` | `invalid_request`   |
 *   | `Authorization: OAuth2 bogus`    | 401    | `unauthorized` | `expired_token`     |
 *   | `Authorization: OAuth2 ` (empty) | 400    | `Invalid authorization header` | (same) |
 *
 * So the status code decides nothing and `error_description` decides
 * everything. Two consequences:
 *
 *  1. `invalid_request` means the credential never reached Podio — the fix is
 *     to reconnect, not to refresh.
 *  2. **`expired_token` does not mean expired.** A token that was never valid,
 *     and a token that was revoked, both report `expired_token`. Podio's own
 *     PHP client keys its automatic refresh-and-retry off exactly this string
 *     (`PodioClient.php`: `strstr($body['error_description'], 'expired_token')`),
 *     which is why a client that trusts it will refresh, retry, get
 *     `expired_token` again and loop. This app therefore reports it as
 *     "rejected" and never as "just needs a refresh".
 */
export type AuthFailureKind = "missing" | "rejected" | "forbidden" | "other";

export function classifyAuthFailure(status: number, body: PodioErrorBody | null): AuthFailureKind {
  const description = body?.error_description ?? "";
  if (status === 403) return "forbidden";
  if (status === 401 || status === 400) {
    if (description.includes("invalid_request")) return "missing";
    if (description.includes("expired_token") || description.includes("invalid_token")) {
      return "rejected";
    }
    if (status === 401) return "rejected";
  }
  return "other";
}

/** Parse a response body as Podio's error envelope, tolerating anything else. */
export async function readErrorBody(res: Response): Promise<PodioErrorBody | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as PodioErrorBody;
  } catch {
    return null;
  }
}

export class PodioClient {
  constructor(private ctx: HookContext) {}

  /**
   * Parse the body.
   *
   * Podio uses no success envelope at all: `GET /org/` answers a bare array,
   * `GET /item/{id}` a bare object. There is nothing to unwrap, which is why
   * this client has one read method where the sibling `apify` app needs three.
   */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the endpoints that answer 204 with no body (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Podio's multi-valued query parameters (`space`, `org`, `reference`,
      // `responsible`) are documented as ONE semicolon-separated value, not as
      // a repeated key: "The list of references on the form `type:id` separated
      // by semi-colon."
      url.searchParams.set(k, Array.isArray(v) ? v.join(";") : String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatPodioError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
