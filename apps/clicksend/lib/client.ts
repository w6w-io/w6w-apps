import type { HookContext } from "@w6w/types";

/**
 * ClickSend REST API v3 client.
 *
 * Everything in this module was verified on 2026-08-24 against ClickSend's own API
 * Blueprint document (Apiary, `jsapi.apiary.io/apis/clicksend.apib`, 574 KB, titled
 * "ClickSend REST API v3") and live probes against `rest.clicksend.com`. Nothing came
 * from a third-party integration directory.
 *
 * ## One host, one envelope
 *
 * The blueprint declares a single host, `https://rest.clicksend.com/v3`, and every
 * response — success or failure — is wrapped in the same envelope:
 * `{http_code, response_code, response_msg, data}`. `data` is `null` on most errors.
 * There is no separate error schema to branch on: the HTTP status and `response_code`
 * always travel together.
 *
 * ## Pagination
 *
 * List endpoints return `data` as a page object (`total`, `per_page`, `current_page`,
 * `last_page`, `next_page_url`, `prev_page_url`, `from`, `to`, `data: [...]`) rather
 * than a bare array, and the actual rows are nested one level deeper under that
 * object's own `data` key. `page`/`limit` query params control it (default 1 page of
 * 15, max 100).
 *
 * ## Errors
 *
 * A failure still answers HTTP 200 in some legacy corners of the API (the "Application
 * Status Codes" table lists `response_code` values like `INVALID_RECIPIENT` and
 * `INSUFFICIENT_CREDIT` that ride inside a per-message `status` field on a 200 batch
 * response — see `formatMessageErrors`), but the endpoints this app calls answer with a
 * real 4xx/5xx and a `response_msg` describing what went wrong. {@link formatClickSendError}
 * surfaces `response_code` and `response_msg` verbatim rather than a flattened "HTTP 400",
 * because the fix differs per code.
 */

export const API_BASE = "https://rest.clicksend.com/v3";

export interface ClickSendEnvelope<T> {
  http_code: number;
  response_code: string;
  response_msg: string;
  data: T | null;
}

export interface ClickSendPage<T> {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  next_page_url: string | null;
  prev_page_url: string | null;
  from: number | null;
  to: number | null;
  data: T[];
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/** Drop keys the caller left unset, so an optional field is never sent as `"undefined"`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn ClickSend's envelope into one actionable line.
 *
 * `response_code` is a stable machine token (`UNAUTHORIZED`, `BAD_REQUEST`,
 * `FORBIDDEN`, …) documented in the "Status Codes" section, and is kept because it is
 * what ClickSend's own support docs are written against — flattening to "HTTP 400"
 * hides which one you hit.
 */
export function formatClickSendError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: Partial<ClickSendEnvelope<unknown>> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<ClickSendEnvelope<unknown>>;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed?.response_code && !parsed?.response_msg) {
    return `ClickSend ${status} for ${method} ${path}: ${truncate(raw)}`;
  }
  const parts = [
    `ClickSend ${status} ${parsed.response_code ?? "ERROR"} for ${method} ${path}`,
    parsed.response_msg,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * Per-recipient failures inside an otherwise-200 batch send.
 *
 * Send SMS/MMS/Voice all accept up to 1000 messages in one call and answer 200 as
 * long as the request itself was well-formed — a single bad recipient does not fail
 * the whole call. Each message in the response carries its own `status` field, which
 * is `"SUCCESS"` or one of the Application Status Codes (`INVALID_RECIPIENT`,
 * `INSUFFICIENT_CREDIT`, `INVALID_SENDER_ID`, …). Silently returning the envelope
 * would hide a queued-but-rejected message inside a "successful" Action result.
 */
export function partialFailures(
  messages: Array<{ to?: string; status?: string }> | undefined,
): string[] {
  if (!messages) return [];
  return messages
    .filter((m) => m.status && m.status !== "SUCCESS")
    .map((m) => `${m.to ?? "(unknown recipient)"}: ${m.status}`);
}

export class ClickSendClient {
  constructor(private ctx: HookContext) {}

  /** Unwrap `{data: ...}`. Used for endpoints that return a single object or a page. */
  async data<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const envelope = await this.envelope<T>(path, options);
    return envelope.data as T;
  }

  /** The full envelope, for callers that need `response_msg` on a "successful" 200. */
  async envelope<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ClickSendEnvelope<T>> {
    const res = await this.send(path, options);
    const text = await res.text();
    let parsed: ClickSendEnvelope<T>;
    try {
      parsed = JSON.parse(text) as ClickSendEnvelope<T>;
    } catch {
      throw new Error(
        `ClickSend ${res.status} for ${options.method ?? "GET"} ${path} returned a non-JSON body: ${
          truncate(text)
        }`,
      );
    }
    if (!res.ok) {
      throw new Error(formatClickSendError(res.status, options.method ?? "GET", path, text));
    }
    return parsed;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
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

    return await this.ctx.fetch(url.toString(), init);
  }
}
