import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key (`api-key`) — the whole authentication story for the OnceHub API.
 * OnceHub publishes no OAuth surface for third-party integrations; every
 * request carries a single account-scoped key in a custom `API-Key` header
 * — NOT `Authorization: Bearer …`, which is the easy first mistake. Verified
 * 2026-08-25 against
 * https://help.oncehub.com/developers/overview/authentication/:
 *
 *   GET /bookings HTTP/1.1
 *   Host: api.oncehub.com
 *   API-Key: your-api-key-here
 *
 * Keys are minted at Settings → Account Integrations → APIs & Webhooks →
 * API Keys, are shown once at creation, and up to 25 may be active at once
 * (OnceHub has no per-key scoping — every key can do everything the account
 * can).
 *
 * `test` calls the dedicated validation endpoint, `GET /v2/test`
 * (https://help.oncehub.com/developers/api/#tag/authentication/GET/test).
 * Its body is `{ "message": "The API key is valid for account: <email>" }`
 * on success — the account owner's email, never the key itself, so it is
 * safe to use as both the connect-time probe and the derived `auth:api-key`
 * health check.
 *
 * Classification is by BODY, not status code: every OnceHub error response is
 * `{ type, message, param? }` (see `../lib/client.ts`), and the documented
 * 401 example is literally `{ "type": "authentication_error", "message":
 * "Invalid API key." }` — confirmed live against `api.oncehub.com` (an
 * unsigned request returns exactly that, 60 bytes). A 403 also carries
 * `type: "authentication_error"` but means something different (the account's
 * plan doesn't include API access at all, not that the key is wrong), so the
 * message is surfaced rather than collapsed into one generic "invalid" verdict.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Settings → Account Integrations → APIs & Webhooks → API Keys → Create API key. Shown once at creation.",
  connectionLabel: "{{account.email}}",
  apiKey: { in: "header", name: "API-Key" },
  fields: [
    { key: "apiKey", label: "API Key", type: "secret", required: true },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["API-Key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/test`, { headers: { "API-Key": apiKey } });
    const body = await res.json().catch(() => ({})) as { message?: string; type?: string };
    if (!res.ok) {
      return { ok: false, message: body.message ?? `OnceHub returned ${res.status}` };
    }
    return { ok: true, message: body.message };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/test`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as { message?: string };
    // "The API key is valid for account: admin@example.com" — extract the email.
    const match = body.message?.match(/account:\s*(\S+)$/);
    return match ? { account: { email: match[1] } } : {};
  },
};

export default apiKey;
