import type { HookContext } from "@w6w/types";

export const API_BASE = "https://api.twilio.com/2010-04-01";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Form fields — Twilio's REST API accepts `application/x-www-form-urlencoded`. */
  form?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization directly — the
 * runtime routes the request through the auth `sign` hook, which injects
 * Basic auth from the account SID / auth token pair.
 *
 * The Twilio REST API is rooted at `/2010-04-01/Accounts/{accountSid}` for
 * account-scoped resources. The caller passes the SID through the client
 * constructor rather than relying on a credential shape here (the credential
 * only reaches the isolated `sign` hook).
 */
/**
 * Read the Twilio Account SID surfaced by `auth/api-key.ts` via `afterConnect`.
 * The credential itself is only visible to `sign`; the SID rides along in the
 * connection's public display metadata so actions can build account-scoped URLs
 * without touching secrets.
 */
export function accountSidFromCtx(ctx: HookContext): string {
  const sid = ctx.connection?.display?.accountSid;
  if (typeof sid !== "string" || sid.length === 0) {
    throw new Error(
      "Twilio Account SID missing from connection. Reconnect the Twilio account.",
    );
  }
  return sid;
}

export class TwilioClient {
  private readonly accountSid: string;

  constructor(private ctx: HookContext, accountSid?: string) {
    this.accountSid = accountSid ?? accountSidFromCtx(ctx);
  }

  accountPath(endpoint: string): string {
    return `${API_BASE}/Accounts/${this.accountSid}${endpoint}`;
  }

  async request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
    const u = new URL(url);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        u.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = { method: options.method ?? "GET", headers: {} };
    if (options.form !== undefined) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null) continue;
        params.set(k, String(v));
      }
      (init.headers as Record<string, string>)["content-type"] =
        "application/x-www-form-urlencoded";
      init.body = params.toString();
    }

    const res = await this.ctx.fetch(u.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Twilio ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${u.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

const XML_CHAR_MAP: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "\"": "&quot;",
  "'": "&apos;",
};

/** Escape a plain-text message for embedding inside a TwiML `<Say>` element. */
export function escapeXml(str: string): string {
  return str.replace(/[<>&"']/g, (ch) => XML_CHAR_MAP[ch]);
}
