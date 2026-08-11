import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Baserow REST client.
 *
 * Everything in this module was verified against Baserow's own OpenAPI document
 * on 2026-08-10 — `https://api.baserow.io/api/schema.json`, OpenAPI 3.0.3,
 * "Baserow API spec" **v2.3.3**, 6.0 MB, 293 paths — plus live probes against
 * `api.baserow.io`. Nothing here came from a third-party integration directory.
 *
 * ## There is no single vendor host
 *
 * Baserow is open source (MIT core) and runs both as Baserow's hosted service at
 * `api.baserow.io` and as a self-hosted Docker container on someone's own
 * domain. Its OpenAPI document declares **no `servers` block at all** — i.e.
 * "wherever you put it".
 *
 * Two consequences, both deliberate and both matching the sibling `metabase`,
 * `grist` and `discourse` apps:
 *
 *   - the manifest declares `network.allow: ["*"]`, because the reachable host
 *     is the customer's own domain and cannot be enumerated in advance;
 *   - the instance URL is an **Auth field**, not an Action param. A database
 *     token is minted on one instance and is valid on that instance only, so
 *     the URL and the token are two halves of one Connection. `afterConnect`
 *     republishes it on `connection.display.siteUrl` and this module reads it
 *     from there, so the client can address the right host without ever seeing
 *     a credential.
 *
 * ## The two auth schemes, and why this app uses only one
 *
 * The spec declares three security schemes; two matter:
 *
 *   | Scheme         | Header                     | Obtained by            |
 *   | -------------- | -------------------------- | ---------------------- |
 *   | Database token | `Authorization: Token …`   | Settings → Database tokens |
 *   | JWT            | `Authorization: JWT …`     | `POST /api/user/token-auth/` with an email and password |
 *
 * This app is **database-token only**, and every action it ships is one the
 * spec marks as accepting a database token. That is not a limitation worked
 * around; it is the surface chosen:
 *
 *  1. **`sign` cannot make a network call.** A JWT has to be fetched before it
 *     can be attached, and it expires, so a JWT app would have to re-authenticate
 *     underneath a Connection that looks healthy.
 *  2. **A JWT means storing a human's password**, where a database token is
 *     scoped to one database with per-table create/read/update/delete flags and
 *     can be revoked on its own.
 *
 * The cost is real and is stated in the README: schema *writes* (creating tables
 * or fields) and view configuration need a JWT and are not available here.
 *
 * ## `user_field_names` is the flag that makes the API legible
 *
 * By default Baserow keys row data by internal field id — `{"field_4321":
 * "Ada"}`. With `user_field_names` the same row is `{"Name": "Ada"}`. Baserow
 * accepts `y`, `yes`, `true`, `t`, `on`, `1` or an empty value as "on".
 *
 * Every row action in this app defaults it to **on**, because a workflow author
 * mapping fields by number is writing something that breaks silently the moment
 * a field is recreated. {@link userFieldNamesFlag} is the one place the flag's
 * wire format is produced.
 */

/** Baserow's hosted instance. Only ever a default — self-hosted is first-class. */
export const HOSTED_BASE = "https://api.baserow.io";

/** Public (redacted-safe) Connection metadata published by `afterConnect`. */
export interface BaserowConnectionDisplay {
  /** Origin of the Baserow instance, normalised: no trailing slash, no `/api`. */
  siteUrl?: string;
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * People paste all of `baserow.example.com`, `https://baserow.example.com/`,
 * `https://api.baserow.io/api` and a link to a grid view. All mean one instance.
 *
 * The `/api` strip is not cosmetic: Baserow's own docs example is
 * `curl https://api.baserow.io/api/database/rows/table/1/`, so `…/api` is as
 * plausible a paste as the bare origin, and silently producing `/api/api/…`
 * would be a baffling 404.
 *
 * A missing scheme defaults to `https`: a token in flight deserves TLS, and
 * silently producing `http://` from a bare hostname would downgrade the
 * credential's transport. Operators running plaintext on a private network can
 * still type `http://` explicitly.
 */
export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Baserow URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Baserow URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Baserow URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function siteUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as BaserowConnectionDisplay;
  if (display.siteUrl) return normalizeSiteUrl(display.siteUrl);
  throw new Error(
    "Baserow connection records no instance URL — reconnect it so the URL can be stored.",
  );
}

/**
 * Baserow's boolean query flags (`user_field_names`, `send_webhook_events`,
 * `include_metadata`) are string flags, not JSON booleans.
 *
 * The spec's wording: a flag is on when its value is one of `y`, `yes`, `true`,
 * `t`, `on`, `1`, or empty. `true`/`false` are used here because they are the
 * two the documentation's own examples show, and because `false` is explicit
 * rather than relying on absence.
 */
export function flag(on: boolean | undefined): string | undefined {
  if (on === undefined) return undefined;
  return on ? "true" : "false";
}

/**
 * `user_field_names`, defaulted ON.
 *
 * Kept separate from {@link flag} so the default lives in exactly one place: an
 * action that forgets to pass it still gets human-readable field names rather
 * than silently falling back to `field_4321` keys.
 */
export function userFieldNamesFlag(value: boolean | undefined): string {
  return value === false ? "false" : "true";
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** Baserow's paginated list envelope. */
export interface BaserowPage<T = Record<string, unknown>> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Baserow's error body: a machine-readable `error` code plus a human `detail`.
 * `detail` is a string for most failures and a per-field object for validation
 * errors, which is why it is typed loosely and rendered rather than indexed.
 */
interface BaserowErrorBody {
  error?: string;
  detail?: unknown;
}

/**
 * Drop keys the caller left unset.
 *
 * Baserow's row update is a `PATCH` that applies exactly the keys present, so
 * forwarding a field the user never touched would overwrite a real value with a
 * blank. `false` and `0` survive — an unchecked boolean field and a zero are
 * both real values.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `json` param as either a parsed value or the string a user typed. */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Same, but absence is simply absence. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return asJson<T>(value, label);
}

/**
 * Parse a comma-separated list of row ids into the integer array Baserow's
 * batch endpoints require.
 *
 * The batch endpoints type `items` as an array of integers with `minItems: 1`
 * and `maxItems: 200`. A string of ids is what a workflow actually produces
 * upstream, so the conversion — and the 200 ceiling — is enforced here rather
 * than left to fail as an opaque 400.
 */
export function parseRowIds(raw: string, label = "Row IDs"): number[] {
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${label}: "${s}" is not a row id`);
    return n;
  });
  if (ids.length === 0) throw new Error(`${label} is empty`);
  assertBatchSize(ids.length, label);
  return ids;
}

/** Baserow caps every batch endpoint at 200 items. Say so before the server does. */
export function assertBatchSize(count: number, label: string): void {
  if (count > MAX_BATCH_SIZE) {
    throw new Error(
      `${label}: ${count} items exceeds Baserow's batch maximum of ${MAX_BATCH_SIZE}. Split the ` +
        "list across several steps.",
    );
  }
}

export const MAX_BATCH_SIZE = 200;

/** Keep an error message readable — a validation body lists every bad field. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render Baserow's error body as one actionable line.
 *
 * The `error` code is the useful half and is stable across versions —
 * `ERROR_TOKEN_DOES_NOT_EXIST`, `ERROR_NO_PERMISSION_TO_TABLE`,
 * `ERROR_ROW_DOES_NOT_EXIST` — while `detail` carries the human text, or a
 * `{field: [messages]}` map for a validation failure. Both are surfaced; neither
 * can carry credential material, since the credential never enters this module.
 */
export function formatBaserowError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: BaserowErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as BaserowErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (!parsed.error && !parsed.detail)) {
    return `Baserow ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const detail = typeof parsed.detail === "string"
    ? parsed.detail
    : parsed.detail
    ? JSON.stringify(parsed.detail)
    : "";
  const parts = [
    `Baserow ${status}${parsed.error ? ` ${parsed.error}` : ""} for ${method} ${path}`,
    detail,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export class BaserowClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = siteUrlFromConnection(ctx.connection);
  }

  /** JSON in, JSON out. `204` and an empty body both resolve to `undefined`. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
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
      throw new Error(formatBaserowError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/**
 * Merge caller-supplied `filter__{field}__{filter}` parameters into a query.
 *
 * Baserow's row filters are **dynamically named query parameters**, not values:
 * `?filter__field_4321__contains=ada`, or with `user_field_names` on,
 * `?filter__Name__contains=ada`. An OpenAPI document cannot enumerate them and
 * neither can a form, so this app takes them as a JSON object of
 * `{ "filter__Name__contains": "ada" }` pairs and merges them here.
 *
 * Only keys starting with `filter__` are accepted. Without that guard this
 * parameter would be an arbitrary query-string injection point into whatever
 * endpoint it was attached to — a caller could smuggle in `user_field_names` or
 * `size` and silently change the shape of the response.
 */
export function mergeFilters(
  query: Record<string, QueryValue>,
  filters: Record<string, unknown> | undefined,
): Record<string, QueryValue> {
  if (!filters) return query;
  const out = { ...query };
  for (const [k, v] of Object.entries(filters)) {
    if (!k.startsWith("filter__")) {
      throw new Error(
        `Field filters: "${k}" is not a filter parameter. Keys must look like ` +
          "`filter__<field>__<filter>`, e.g. `filter__Name__contains`.",
      );
    }
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}
