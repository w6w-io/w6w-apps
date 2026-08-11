/**
 * Datadog REST client (API v1 + v2).
 *
 * Every path, verb, query parameter, body field and enum used by this app was
 * verified on 2026-08-11 against Datadog's own OpenAPI documents — the
 * `.generator/schemas/v1/openapi.yaml` (1,664,082 bytes, 150 paths) and
 * `v2/openapi.yaml` (7,585,237 bytes, 950 paths) that Datadog publishes in
 * `DataDog/datadog-api-client-python` and generates every official client and
 * `docs.datadoghq.com/api/latest/` from — plus live probes against all nine
 * `api.<site>` hosts. Nothing here came from a third-party integration
 * directory.
 *
 * ## One origin per Connection, chosen by the site
 *
 * There is no single Datadog host. See `lib/sites.ts` for the whole story; the
 * short version is that the origin comes from the Connection's site and nothing
 * else, and that an Action never learns it any other way.
 *
 * ## Two auth headers, and they are not interchangeable
 *
 * `DD-API-KEY` identifies the organization; `DD-APPLICATION-KEY` identifies a
 * user within it and carries that user's permissions. The vendor's own
 * `securitySchemes` name both, and each operation declares which it needs:
 *
 *  - `security: [{apiKeyAuth: []}]`             → API key **only**. Submission
 *    endpoints: `POST /api/v2/series`, `POST /api/v1/events`, `GET /api/v1/validate`.
 *  - `security: [{apiKeyAuth, appKeyAuth}, …]`  → **both**. Every read.
 *
 * So a Connection holding only an API key can submit and cannot read. The auth
 * method models that honestly rather than demanding both up front — see
 * `auth/api-key.ts`.
 *
 * ## Never decide "is the credential valid?" from the status code
 *
 * Datadog's status codes for authentication are inconsistent **between its own
 * endpoints**, measured live on `api.datadoghq.com`, 2026-08-11:
 *
 *   | Request                                     | Status | Body                          |
 *   | ------------------------------------------- | ------ | ----------------------------- |
 *   | `GET /api/v1/validate`, no key               | 403    | `{"errors":["Forbidden"]}`    |
 *   | `GET /api/v1/validate`, well-formed fake key | 403    | `{"errors":["Forbidden"]}`    |
 *   | `GET /api/v1/validate`, garbage key          | 403    | `{"errors":["Forbidden"]}`    |
 *   | `GET /api/v1/monitor`, no keys               | 401    | `{"errors":["Unauthorized"]}` |
 *   | `GET /api/v2/current_user`, no keys          | 401    | `{"errors":["Unauthorized"]}` |
 *   | `GET /api/v2/current_user`, fake keys        | 403    | `{"errors":["Forbidden"]}`    |
 *
 * Read the first three rows: `/api/v1/validate` answers **403** where every
 * other endpoint answers 401, and it answers *byte-identically* for a missing
 * key and a rejected one. So "401 means no credential, 403 means bad credential"
 * — true for the rest of the API — is exactly backwards on the one endpoint
 * whose entire job is validating a credential. The positive answer is the only
 * reliable one: `200 {"valid": true}`. That is what `auth/api-key.ts` asserts,
 * and it is why the unauthenticated reachability probe in `health/api.ts`
 * accepts **either** 401 or 403 as proof the site is answering.
 *
 * ## Two error body shapes, not one
 *
 * Datadog ships two `errors` schemas and uses both:
 *
 *  - `APIErrorResponse` — `{"errors": ["Forbidden"]}`, an array of **strings**.
 *    All of v1 and most of v2.
 *  - `JSONAPIErrorResponse` — `{"errors": [{"status","title","detail","source"}]}`,
 *    an array of **objects**. The JSON:API-shaped v2 resources (downtimes,
 *    users, …), 1,256 references in the v2 document.
 *
 * Code that reads `errors[0]` as a string prints `[object Object]` for half the
 * API. {@link datadogErrorMessages} handles both and is unit-tested against
 * both.
 *
 * ## Bracketed query parameters
 *
 * v2 filters are spelled `filter[query]`, `page[limit]`, `page[cursor]`. The
 * vendor's own note on `GET /api/v2/metrics` says to "pass them as standard URL
 * query strings, URL-encoding the brackets if your client does not handle
 * them", which is precisely what `URLSearchParams` does (`filter%5Bquery%5D`).
 * No special-casing is needed and none is done.
 */
import type { HookContext } from "@w6w/types";
import { apiBase, type DatadogSite, siteFromConnection } from "./sites.ts";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** `{"errors": ["…"]}` — v1 and most of v2. */
interface StringErrorBody {
  errors?: unknown;
}

/** One member of the JSON:API-shaped `errors` array. */
interface JsonApiError {
  status?: string;
  title?: string;
  detail?: string;
  source?: { pointer?: string; parameter?: string };
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `current_only=false` and `page[limit]=0` are both
 * expressible, and silently dropping them would make them unreachable.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Path-escape a caller-supplied identifier.
 *
 * Datadog ids are of three kinds and all three survive `encodeURIComponent`
 * unchanged: numeric monitor/event ids, UUID downtime and user ids, and the
 * short alphanumeric dashboard id (`abc-def-ghi`). What does not survive is a
 * `/` or `?` pasted into an id field, which is the point.
 *
 * A metric name is passed through the same function: metric names are
 * `a-zA-Z0-9._` by Datadog's own naming rules, but they arrive from a form.
 */
export function encodeSegment(value: string | number): string {
  return encodeURIComponent(String(value ?? "").trim());
}

/** Normalise a comma-separated or repeated param into a list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
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

/** Same, but absence is an error. */
export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/**
 * Pull human-readable messages out of **either** Datadog error shape.
 *
 * Returns `[]` when the body is neither — the caller then falls back to the raw
 * text, which is better than inventing a message for an HTML error page served
 * by something in front of the API.
 */
export function datadogErrorMessages(raw: string): string[] {
  let parsed: StringErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as StringErrorBody;
  } catch {
    return [];
  }
  const errors = parsed?.errors;
  if (!Array.isArray(errors)) return [];

  const out: string[] = [];
  for (const entry of errors) {
    if (typeof entry === "string") {
      if (entry) out.push(entry);
      continue;
    }
    if (entry && typeof entry === "object") {
      const e = entry as JsonApiError;
      // `title` is the category ("Bad Request"), `detail` the specific cause.
      // Both matter and neither is always present.
      const parts = [e.title, e.detail].filter((p): p is string => !!p);
      const pointer = e.source?.pointer ?? e.source?.parameter;
      const text = parts.join(": ");
      if (text) out.push(pointer ? `${text} (at ${pointer})` : text);
    }
  }
  return out;
}

/**
 * Turn a Datadog failure into one actionable line.
 *
 * The site is named in every message because the single most common Datadog
 * integration failure is a key from the wrong site: it is indistinguishable
 * from a revoked key on the wire (both `403 Forbidden`), and the fix is
 * completely different. Naming the host that refused the request is what makes
 * that visible without guessing.
 *
 * The message carries only Datadog's own prose, the caller's own input and the
 * site label. No credential reaches this module.
 */
export function formatDatadogError(
  status: number,
  method: string,
  path: string,
  raw: string,
  site: DatadogSite,
): string {
  const messages = datadogErrorMessages(raw);
  const detail = messages.length > 0 ? messages.join("; ") : truncate(raw);
  const parts = [`Datadog ${status} for ${method} ${path} on ${site.label}`];
  if (detail) parts.push(detail);

  if (status === 401) {
    parts.push(
      "401 from Datadog means no credential reached the API — reconnect this connection",
    );
  } else if (status === 403) {
    parts.push(
      "403 means the keys were present and refused: either they belong to a different Datadog " +
        `site than ${site.label}, or the application key's user lacks the permission this ` +
        "endpoint requires",
    );
  } else if (status === 429) {
    parts.push(
      "Datadog rate-limits per endpoint; the X-RateLimit-Reset response header gives the seconds " +
        "until the window resets",
    );
  }
  return truncate(parts.join(": "), 1200);
}

export class DatadogClient {
  /** Resolved once per hook invocation, from the Connection and nothing else. */
  readonly site: DatadogSite;

  constructor(private ctx: HookContext) {
    this.site = siteFromConnection(ctx.connection);
  }

  /** Parse the body. Datadog answers JSON for everything this app calls. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for the endpoints that answer 202/204 with no useful body. */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${apiBase(this.site)}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Datadog's multi-valued query parameters (`sources`, `tags`,
      // `monitor_tags`, `filter[indexes]`) are documented as ONE
      // comma-separated value, not as a repeated key.
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    // No auth headers here, ever. The runtime routes this request through the
    // Auth `sign` hook, which is the only code handed the keys.
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
        formatDatadogError(res.status, init.method ?? "GET", url.pathname, detail, this.site),
      );
    }
    return res;
  }
}
