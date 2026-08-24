import type { HookContext } from "@w6w/types";

/**
 * PDF.co REST client.
 *
 * Verified 2026-08-24 against PDF.co's own OpenAPI 3.0 document
 * (`developer.pdf.co/openapi.json`, 553,062 bytes, `info.version` `1.0`, 67
 * paths), the same site's per-endpoint Markdown reference (`llms-full.txt`,
 * 3.4 MB — the "Attributes" table on each page), and live probes against
 * `api.pdf.co` and `status.pdf.co`. Nothing here came from a third-party
 * integration directory.
 *
 * ## The openapi.json document is not trustworthy on its own — three findings
 *
 * **(1) It lower-cases nearly every field name.** The generated schema calls
 * PDF-to-text's line-grouping field `linegrouping`, PDF Find's search field
 * `searchstring`, PDF-from-HTML's paper size `papersize`, and PDF security's
 * `ownerpassword`/`encryptionalgorithm`. Every one of those is wrong: the
 * vendor's own per-endpoint Markdown tables — and its own working `curl`
 * examples, which actually round-trip — use `lineGrouping`, `searchString`,
 * `paperSize`, `ownerPassword`, `encryptionAlgorithm`. PDF.co's docs say
 * "Attributes are case-sensitive"; sending the openapi.json casing is not an
 * error, it is silently IGNORED (the field is simply absent, so the
 * documented default applies) — the single most expensive way to lose a day
 * on this vendor, because nothing about the response says the field was
 * dropped. Every camelCase field name in this app was cross-checked against
 * the endpoint's own Markdown table and, where one exists, its literal
 * `curl`/JSON example.
 *
 * **(2) Its `required` arrays are sometimes fiction.** `POST /pdf/edit/add`'s
 * schema lists `annotationsString` as required; the Markdown table marks it
 * *No*, and PDF.co's own worked examples call the endpoint with only `url`.
 * `POST /pdf/convert/from/html` similarly lists `templateid` as required,
 * while both the table and the working example omit it. This app follows the
 * Markdown table plus the worked example, never the generated `required`
 * array, for exactly this reason.
 *
 * **(3) A documented "required" field that the vendor's own example omits
 * entirely.** `POST /barcode/read/from/url`'s table marks `type` as
 * *Required: Yes* with default `QRCode` — copy-pasted from the *generate*
 * endpoint's row. The vendor's own worked example sends only `url`, `types`
 * (plural, comma-separated) and `async`, and gets back barcodes of several
 * different types in one call. This app never sends `type` to the reader and
 * documents `types` as the real, optional filter.
 *
 * ## Page indexing is not uniform across the surface
 *
 * Most endpoints take 0-based page ranges (`pages0` in the schema — "the
 * first-page index is 0"). `POST /pdf/edit/delete-pages` is the documented
 * exception: its own Markdown page opens with a `<Warning>` that `pages` is
 * **1-based** there, matching the schema's separate `pages1` type. Passing a
 * 0-based range to `delete-pages` silently deletes the wrong page (page 0
 * doesn't exist in its scheme, so "0" is likely rejected, but "1" — which
 * every other endpoint would read as the SECOND page — deletes the FIRST).
 *
 * ## The response envelope is not one shape
 *
 * A success response typically carries `error: false`, `status: <number>`
 * (e.g. `200`) and the fields the operation produces (`url`, `body`, `info`,
 * `barcodes`, `hash`, …) — but which fields, and whether `status` is present
 * at all, varies per endpoint (`file/hash`'s success example carries neither
 * `error` nor `status`, only `hash` and `remainingCredits`). A failure
 * response reliably carries `error: true` and `message`, but the numeric
 * error code shows up under **two different keys** depending on which layer
 * produced it: `status` (documented on most endpoints' failure schemas, e.g.
 * `{"error":true,"status":400,"message":…}`) or `errorCode` (observed live on
 * every auth failure — `{"status":"error","errorCode":401,"error":true,
 * "message":…}` — and documented on `job/check`'s 404). Note that on an auth
 * failure `status` is itself the STRING `"error"`, not a number — one more
 * reason this client keys error handling off `error`/`message` and treats
 * `status`/`errorCode` as optional diagnostic detail, never as the switch.
 *
 * ## HTTP status doubles as the vendor's own error code
 *
 * PDF.co returns its documented failure codes (`441` invalid password, `442`
 * damaged document, `446` missing files, `452` invalid URL, …) as the actual
 * HTTP status line, per the OpenAPI document's own per-path `responses` map
 * and its Response Codes reference page — not as a `200` wrapping a numeric
 * field. `fetch`/`ctx.fetch` accept any 100–599 status, so `res.ok` (true
 * only for 200–299) already separates these correctly; this client does not
 * special-case the numbers.
 *
 * ## `file/hash` returns SHA-256, not MD5
 *
 * The endpoint is titled "Get MD5 Hash of File by URL" in both the sidebar
 * and the OpenAPI summary. Its own worked example returns
 * `"d942e5becdcb0386598cce15e9e56deb1ca9d893b8578a88eca4a62f02c4000b"` — 64
 * hex characters, the length of a SHA-256 digest, not the 32 an MD5 digest
 * would be. This app's action is titled and documented as a hash check
 * without naming an algorithm the vendor does not actually use.
 *
 * ## Every input is a URL, never raw file bytes
 *
 * Every conversion/edit endpoint takes a `url` to the source file, not a
 * multipart upload — the OpenAPI `file` schema ("path to a local file",
 * `readOnly: true`) exists only for the vendor's own SDKs/Postman collection
 * reading a LOCAL disk path, which a sandboxed Action cannot do, so no Action
 * here exposes it. `POST /file/upload` and `POST /file/upload/base64` share
 * that same generated `file` schema even though `file/upload/base64`'s own
 * Markdown table correctly describes it as "Base64-encoded file bytes" — a
 * second instance of the generic schema being wrong for one of the two
 * endpoints that reuse it. This app implements the base64 and upload-from-URL
 * variants (both reachable without local disk access) and skips the raw
 * multipart `file/upload`, noting why in the README.
 */

/** The one and only API origin. The OpenAPI document declares no other server. */
export const API_BASE = "https://api.pdf.co";

export type JsonRecord = Record<string, unknown>;

/** Drop keys the caller left unset. `false` and `0` survive — both are meaningful values here. */
export function compact(obj: JsonRecord): JsonRecord {
  const out: JsonRecord = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can run long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * The shapes an error body actually arrives in — see the module doc's
 * "response envelope is not one shape" section. All fields optional by
 * design; only `error`/`message` are treated as load-bearing.
 */
export interface PdfCoErrorBody {
  error?: boolean;
  /** A number on most endpoints' documented failures; the literal string `"error"` on an auth failure. */
  status?: number | string;
  errorCode?: number;
  message?: string;
}

/**
 * Turn a PDF.co error response into one actionable line.
 *
 * Reads `message` first (present on every observed and documented failure),
 * falls back to the numeric code under whichever of `errorCode`/`status`
 * is present, and only falls back to the raw body when neither JSON key
 * could be parsed.
 */
export function formatPdfCoError(
  httpStatus: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: PdfCoErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as PdfCoErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || (parsed.message === undefined && parsed.error === undefined)) {
    return `PDF.co ${httpStatus} for ${method} ${path}: ${truncate(raw)}`;
  }

  const code = typeof parsed.errorCode === "number"
    ? parsed.errorCode
    : typeof parsed.status === "number"
    ? parsed.status
    : httpStatus;

  const parts = [
    `PDF.co ${code} for ${method} ${path}`,
    parsed.message,
    code === 429 ? "PDF.co is rate-limiting this API key; retry with backoff" : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: JsonRecord;
}

export class PdfCoClient {
  constructor(private ctx: HookContext) {}

  /** POST a JSON body, parse and return the JSON response. Throws on a non-2xx status. */
  async post<T = JsonRecord>(path: string, body: JsonRecord): Promise<T> {
    return await this.send<T>(path, { method: "POST", body });
  }

  /** GET with query parameters, parse and return the JSON response. Throws on a non-2xx status. */
  async get<T = JsonRecord>(
    path: string,
    query?: RequestOptions["query"],
  ): Promise<T> {
    return await this.send<T>(path, { method: "GET", query });
  }

  private async send<T>(path: string, options: RequestOptions): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
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
      throw new Error(formatPdfCoError(res.status, init.method ?? "GET", url.pathname, text));
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** Fields present on most success responses. Which subset varies — see module doc. */
export interface PdfCoBaseFields {
  name?: string;
  credits?: number;
  remainingCredits?: number;
  duration?: number;
}
