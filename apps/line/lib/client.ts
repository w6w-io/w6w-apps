import type { HookContext } from "@w6w/types";

/**
 * LINE Messaging API client.
 *
 * Verified 2026-09-05 against the vendor's own reference source
 * (`github.com/line/line-developers-docs-source`, `docs/en/reference/messaging-api/index.html.md`,
 * ~694,000 bytes — the same content the rendered
 * [reference page](https://developers.line.biz/en/reference/messaging-api/) is built from, fetched
 * directly because that page renders its endpoint detail client-side) plus live probes against
 * `api.line.me`.
 *
 * ## Two hosts, not one
 *
 * The reference states this as its very first "Common specification": every endpoint lives on
 * `api.line.me` **except** five that move large binary payloads, which live on `api-data.line.me`
 * instead — getting a user's media, uploading/downloading a rich menu image, and the two
 * upload-by-file audience endpoints. This app never touches the audience endpoints, so only the
 * media and rich-menu-image actions use the second host. Both are declared in `w6w.network.allow`.
 *
 * ## One error shape, and it echoes nothing
 *
 * Every failure is `{"message": "...", "details"?: [{"message", "property"}]}` — confirmed live: an
 * unauthenticated `GET /v2/bot/info` answers `401` with
 * `{"message":"Authorization header required. Must follow the scheme, 'Authorization: Bearer
 * <ACCESS TOKEN>'"}`, and a syntactically-plausible-but-wrong token answers `401` with
 * `{"message":"Authentication failed. Confirm that the access token in the authorization header is
 * valid."}` — two different, actionable messages, and neither echoes anything about the token
 * itself.
 */

/** Every endpoint except the five below. */
export const API_HOST = "https://api.line.me";

/** Media and rich-menu-image endpoints only — see the module doc. */
export const API_DATA_HOST = "https://api-data.line.me";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /** Extra headers, e.g. `X-Line-Retry-Key`. Never `authorization` — that is `sign`'s job. */
  headers?: Record<string, string>;
}

interface LineErrorBody {
  message?: string;
  details?: Array<{ message?: string; property?: string }>;
}

/** Keep an error message readable — a validation body can carry several `details`. */
function truncate(text: string, max = 800): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn LINE's error body into one actionable line.
 *
 * `details[].property` names the exact JSON field or query parameter LINE objected to (e.g.
 * `messages[0].text`), which the bare `message` alone does not — collapsing them loses precisely
 * the thing a caller needs to fix a 400 on a five-message array.
 */
export function formatLineError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: LineErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as LineErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.message) {
    return `LINE ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const details = (parsed.details ?? [])
    .map((d) => [d.property, d.message].filter(Boolean).join(": "))
    .filter(Boolean);
  return truncate([`LINE ${status} for ${method} ${path}`, parsed.message, ...details].join(" — "));
}

/** Drop keys the caller left unset so optional fields don't reach the API as `null`. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either the parsed value the host already resolved, or the raw string a
 * user typed into a code field — the host hands a `json` param through in whichever shape it
 * arrived.
 */
export function asJson<T>(value: unknown, label: string): T {
  if (typeof value !== "string") {
    if (value === undefined || value === null) throw new Error(`${label} is required`);
    return value as T;
  }
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required`);
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Normalise an `array` param (or a comma-separated string) into a list of non-empty strings. */
export function toStringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const items = raw.map((v) => String(v).trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Base64 (optionally a `data:...;base64,` URI) to raw bytes.
 *
 * A workflow cannot attach bytes it never had, so a rich-menu image is supplied this way rather
 * than as a URL this app would need to fetch itself — an arbitrary caller-supplied image host is
 * never in `w6w.network.allow`, so `ctx.fetch` could not reach it anyway.
 */
export function base64ToBytes(input: string): Uint8Array {
  const cleaned = input.includes(",") ? input.split(",", 2)[1] : input;
  const bin = atob(cleaned.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Raw bytes to base64 — exact, because it runs on a downloaded `ArrayBuffer`, real bytes that
 * survive the sandbox boundary intact (unlike the string produced by decoding base64 back down,
 * which the runtime's worker fetch shim would re-encode as UTF-8 if it were ever sent back out as a
 * request body string — see {@link base64ToBytes}'s callers, which always pass bytes as an
 * `ArrayBuffer`, never as a string, for exactly this reason).
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export class LineClient {
  constructor(private ctx: HookContext, private base: string = API_HOST) {}

  /** Parse the JSON body. Every endpoint on both hosts except the two binary ones below. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * The body verbatim, base64-encoded, with the content type LINE served it under.
   *
   * Used for `content-get` and the rich-menu image download — both answer raw binary, not JSON, and
   * decoding those as text would corrupt them.
   */
  async binaryGet(
    path: string,
  ): Promise<{ status: number; contentType: string; base64: string; bytes: number }> {
    const url = `${this.base}${path}`;
    const res = await this.ctx.fetch(url, { headers: { accept: "*/*" } });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLineError(res.status, "GET", path, detail));
    }
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const buffer = new Uint8Array(await res.arrayBuffer());
    return { status: res.status, contentType, base64: bytesToBase64(buffer), bytes: buffer.length };
  }

  /**
   * POST raw bytes with an explicit `Content-Type` — the rich-menu image upload's shape, LINE's
   * only endpoint whose request body is not JSON.
   *
   * The bytes are sent as an `ArrayBuffer`, never coerced through a JS string, so a byte >= 0x80
   * survives the trip — see {@link bytesToBase64}'s doc comment for why a string body would not.
   */
  async binaryPost(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    const url = `${this.base}${path}`;
    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: { "content-type": contentType, accept: "application/json" },
      body: bytes.slice().buffer,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLineError(res.status, "POST", path, detail));
    }
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
    };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatLineError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
