import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Drip API Token (`basic`).
 *
 * Verified against developer.drip.com's "Authentication" section: "The API
 * Token is the username portion of the Basic Authentication scheme, with an
 * empty password. (Note the trailing colon to indicate an empty password.)"
 * The docs' own curl example confirms it: `-u YOUR_API_KEY:` — a bare colon,
 * nothing after it.
 *
 * The account id is collected here too, not re-entered per action: nearly
 * every endpoint is scoped `/v2/:account_id/...`, so it identifies the
 * account and belongs to the Connection (mirrors `apps/freshdesk`'s
 * `domain` field). `afterConnect` echoes it onto the connection's display
 * data, which is where `lib/client.ts` reads it from.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Token",
  description:
    "Paste your personal API Token from https://www.getdrip.com/user/edit, plus the numeric Account ID it belongs to (shown in the same account's Settings, and in every Drip dashboard URL).",
  connectionLabel: "{{user.email}} ({{accountId}})",
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      placeholder: "1234567",
      hint: "The numeric account id, e.g. from https://www.getdrip.com/1234567/...",
      validation: { pattern: "^[0-9]+$" },
    },
    {
      key: "apiKey",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Account → Settings → My User Settings → API Token.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: token } = credential as { apiKey: string };
    // Basic auth, username = token, password = empty string (trailing colon).
    request.headers["authorization"] = `Basic ${btoa(`${token}:`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accountId, apiKey: token } = credential as { accountId?: string; apiKey?: string };
    if (!accountId || !token) {
      return { ok: false, message: "credential missing accountId or apiKey" };
    }
    const res = await ctx.fetch(`${API_BASE}/user`, {
      headers: { authorization: `Basic ${btoa(`${token}:`)}` },
    });
    if (!res.ok) return { ok: false, message: `Drip returned ${res.status}` };
    // Classify by the body, never the status alone: a misconfigured proxy or
    // an HTML error page can still answer 200. `/v2/user` never echoes the
    // token itself — it returns display fields only (email, name, time zone)
    // — so this probe can never leak the credential back into a log.
    const body = await res.json().catch(() => null) as { users?: unknown[] } | null;
    if (!body || !Array.isArray(body.users) || body.users.length === 0) {
      return { ok: false, message: "Drip response did not include a `users` array" };
    }
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accountId, apiKey: token } = credential as { accountId?: string; apiKey?: string };
    if (!accountId) return {};
    // afterConnect's ctx.fetch is unsigned — sign it ourselves, exactly as
    // `test` does.
    let user: Record<string, unknown> | undefined;
    try {
      const res = await ctx.fetch(`${API_BASE}/user`, {
        headers: { authorization: `Basic ${btoa(`${token}:`)}` },
      });
      if (res.ok) {
        const body = await res.json() as { users?: Array<Record<string, unknown>> };
        user = body.users?.[0];
      }
    } catch { /* best-effort — the account id alone is still useful */ }
    return user ? { accountId, user } : { accountId };
  },
};

export default apiKey;
