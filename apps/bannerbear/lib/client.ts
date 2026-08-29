import type { HookContext } from "@w6w/types";

/**
 * Bannerbear V5 REST client.
 *
 * Everything in this module was verified on 2026-08-29 against Bannerbear's own
 * machine-readable OpenAPI 3.0 document, fetched live from
 * `https://api.bannerbear.com/v5/openapi.json` (183,305 bytes, `info.title`
 * "Bannerbear V5 API", `info.version` "5.0"), cross-checked against the
 * human-readable reference at `https://developers.bannerbear.com/v5/` (327,992
 * bytes). Nothing here came from a third-party integration directory or from an
 * older Bannerbear API version — v5 renamed and reshaped several v4/v2
 * concepts (there is no `/movies` or `/collections` endpoint in v5; the closest
 * equivalents are `/animations` and `/batches`).
 *
 * ## Two hosts, and only one endpoint uses both
 *
 * The OpenAPI document declares two servers:
 *
 *  - `https://api.bannerbear.com/v5` — the async host. Every endpoint in this
 *    app reaches it. A render (`POST /images`, `POST /animations`,
 *    `POST /batches`, any `/tools/*`, `POST /workflow_runs`) is accepted with a
 *    `202` and a `pending`/`queued` record; poll the `GET` endpoint for that
 *    resource, or register a Webhook, to learn when it finishes.
 *  - `https://sync.api.bannerbear.com/v5` — the sync host. It accepts **only**
 *    `POST /images`, and answers `200` with the finished image inline instead
 *    of a pending record — or `408` if the render runs long. `image-create`
 *    exposes this as a `useSyncHost` toggle; every other render stays async
 *    because sync has no equivalent for it.
 *
 * ## Auth
 *
 * `Authorization: Bearer <api key>` on every request, verified from both the
 * OpenAPI `securitySchemes.bearerAuth` (`type: http, scheme: bearer`) and the
 * prose reference page. There is no separate sandbox/test host — the same key
 * addresses whichever workspace it belongs to.
 *
 * ## One response shape
 *
 * Unlike some vendors, Bannerbear does not envelope its responses in a `data`
 * key and does not mix bare-array and enveloped list shapes: every list
 * endpoint answers a bare JSON array (`page` query param, no cursor and no
 * total count in the body), every single-resource endpoint answers that
 * resource's object directly, and every documented error answers
 * `{"message": "..."}` with a 4xx/5xx status. That symmetry is why this client
 * has one `json<T>()` method instead of Apify-style `data()`/`json()`/`raw()`
 * variants — the one exception, raw binary asset upload, gets its own
 * {@link BannerbearClient.uploadAsset}.
 *
 * ## Errors, verified against the vendor's own table
 *
 * `https://developers.bannerbear.com/v5/#errors` documents the full status
 * list, reproduced in {@link formatBannerbearError}: 401 (bad key), 402 (quota
 * exhausted — upgrade), 403 (`api_write_access` forbids this key), 404 (not
 * found in this workspace), 408 (sync render timed out), 413 (asset too
 * large), 415 (asset content type not accepted), 422 (validation failure —
 * e.g. width/height out of the 100–3000 range), 423 (template locked,
 * `api_write_access: "nobody"`), 429 (rate limited — the vendor states a flat
 * **60 POST requests per 10-second window**, with no `X-RateLimit-*` response
 * header of any kind, so there is nothing here to read for early warning), 502
 * (upstream storage upload failed), 503 (maintenance).
 */

/** Async render host. Every endpoint in this app reaches it except one call of `image-create`. */
export const API_BASE = "https://api.bannerbear.com/v5";

/**
 * Sync render host. Documented to accept ONLY `POST /images`, answering the
 * finished image inline (`200`) or `408` on a slow render. Never used for any
 * other action — there is no sync equivalent for animations, batches, tools,
 * or workflow runs.
 */
export const SYNC_API_BASE = "https://sync.api.bannerbear.com/v5";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

interface BannerbearErrorBody {
  message?: string;
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: several fields here (`rate_limit`, `scale`) are
 * meaningfully falsy, and silently dropping them would make that value
 * impossible to send.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
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

/** Normalise a `multiselect`/comma-separated param into a string list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Base64 (optionally a `data:...;base64,` URI) to raw bytes, for the asset-upload action. */
export function base64ToBytes(input: string): Uint8Array {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Keep an error message readable — a validation body can be long. */
function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn a Bannerbear error response into one actionable line.
 *
 * Every documented error is `{"message": "..."}`; this adds the vendor's own
 * fix for the status codes worth explaining (see the module doc for the full
 * table) rather than a bare "HTTP 422".
 */
export function formatBannerbearError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: BannerbearErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as BannerbearErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  const message = parsed?.message ?? (raw ? truncate(raw) : undefined);
  const hint: string | undefined = {
    401: "the API key is wrong or was revoked in app.bannerbear.com/v5/api_keys",
    402: "API quota is exhausted for this billing period — upgrade the plan to continue",
    403: "this API key's scopes, or the template's api_write_access, refuse this call",
    404: "not found IN THIS WORKSPACE — a uid from another workspace or key 404s the same way",
    408: "the sync render exceeded the timeout — retry on the async host instead",
    413: "the uploaded asset exceeds Bannerbear's size cap",
    415: "the upload Content-Type is not one of the accepted image/video/audio/pdf types",
    422: "validation failed — check required fields and any documented range (e.g. width/height " +
      "100-3000)",
    423: 'this template\'s api_write_access is "nobody" — the owner must unlock it in the ' +
      "dashboard",
    429: "rate limited — Bannerbear allows 60 POST requests per 10-second window and publishes " +
      "no rate-limit header to poll instead",
    502: "an upstream storage upload failed on Bannerbear's side — usually transient",
    503: "Bannerbear is temporarily offline for maintenance",
  }[status];

  const parts = [`Bannerbear ${status} for ${method} ${path}`, message, hint].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class BannerbearClient {
  constructor(private ctx: HookContext, private base: string = API_BASE) {}

  /** Parse the JSON body. Used for every endpoint except the raw asset upload. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * `POST /assets` — the one endpoint whose BODY is raw bytes, not JSON. The
   * request Content-Type is the asset's own MIME type; the response is still
   * ordinary JSON (the created — or matched, for a duplicate hash —
   * `Asset` record).
   */
  async uploadAsset<T = unknown>(bytes: Uint8Array, contentType: string): Promise<T> {
    const url = `${this.base}/assets`;
    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: { "content-type": contentType, accept: "application/json" },
      body: bytes.slice().buffer,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatBannerbearError(res.status, "POST", "/assets", detail));
    }
    return await res.json() as T;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
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
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        formatBannerbearError(res.status, init.method ?? "GET", url.pathname, detail),
      );
    }
    return res;
  }
}
