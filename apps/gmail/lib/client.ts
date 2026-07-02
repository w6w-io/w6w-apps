import type { HookContext } from "@w6w/types";

/**
 * Inlined base64url encoder — the app sandbox has `import: false`, so we
 * can't pull from jsr:@std/encoding at runtime. Same output as
 * @std/encoding's `encodeBase64Url`: url-safe, no `=` padding.
 */
function encodeBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export const API_URL = "https://gmail.googleapis.com/gmail/v1";

/**
 * Options accepted by GmailClient.request. Note that we never set the
 * Authorization header here — the runtime routes the request through the auth
 * `sign` hook, which injects it. See lib/mime.ts for MIME construction.
 */
export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch` targeting the Gmail REST API.
 *
 * Gmail paginates list endpoints with `nextPageToken`; callers pass back the
 * previous token to walk pages. Non-2xx responses are surfaced verbatim so the
 * upstream error text is visible in workflow logs.
 */
export class GmailClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          // Gmail expects repeated params (e.g. `labelIds=A&labelIds=B`) rather
          // than comma-joined values.
          for (const entry of v) {
            if (entry === undefined || entry === null || entry === "") continue;
            url.searchParams.append(k, String(entry));
          }
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.body !== undefined) {
      (init.headers as Record<string, string>)["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Gmail ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

/**
 * Input shape for building an RFC 2822 email. Only `to` is strictly required
 * for the Gmail API to accept the message; the other fields are optional.
 */
export interface MimeInput {
  to: string;
  from?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject?: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

/** CRLF is required by RFC 2822 — some MTAs reject LF-only. */
const CRLF = "\r\n";

function encodeHeader(value: string): string {
  // RFC 2047 encoded-word for non-ASCII header values. Gmail accepts both raw
  // UTF-8 and encoded-words; encoded-words are safer for spam scoring.
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const b64 = btoa(unescape(encodeURIComponent(value)));
  return `=?UTF-8?B?${b64}?=`;
}

/**
 * Build an RFC 2822 MIME message and return it base64url-encoded, ready to be
 * POSTed as `{ raw }` to `messages/send` or wrapped in `{ message: { raw } }`
 * for drafts. Body defaults to `multipart/alternative` when both text and html
 * are supplied, otherwise a single `text/plain` or `text/html` part.
 */
export function buildMimeMessage(input: MimeInput): string {
  const headers: string[] = [];
  if (input.from) headers.push(`From: ${encodeHeader(input.from)}`);
  headers.push(`To: ${encodeHeader(input.to)}`);
  if (input.cc) headers.push(`Cc: ${encodeHeader(input.cc)}`);
  if (input.bcc) headers.push(`Bcc: ${encodeHeader(input.bcc)}`);
  if (input.replyTo) headers.push(`Reply-To: ${encodeHeader(input.replyTo)}`);
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) headers.push(`References: ${input.references}`);
  headers.push(`Subject: ${encodeHeader(input.subject ?? "")}`);
  headers.push("MIME-Version: 1.0");

  let body: string;
  const hasText = typeof input.text === "string" && input.text.length > 0;
  const hasHtml = typeof input.html === "string" && input.html.length > 0;

  if (hasText && hasHtml) {
    const boundary = `w6w_boundary_${
      Math.random().toString(36).slice(2)
    }${Date.now().toString(36)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      input.text!,
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      input.html!,
      `--${boundary}--`,
      "",
    ].join(CRLF);
  } else if (hasHtml) {
    headers.push("Content-Type: text/html; charset=UTF-8");
    headers.push("Content-Transfer-Encoding: 7bit");
    body = CRLF + input.html!;
  } else {
    headers.push("Content-Type: text/plain; charset=UTF-8");
    headers.push("Content-Transfer-Encoding: 7bit");
    body = CRLF + (input.text ?? "");
  }

  const raw = headers.join(CRLF) + CRLF + body;
  const bytes = new TextEncoder().encode(raw);
  return encodeBase64Url(bytes);
}
