import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Salesloft API Key (`apiKey`) — "exclusively for customers", per Salesloft's
 * own docs (a partner integration is expected to use the OAuth2 app instead).
 * Provisioned under Salesloft Account → Your Applications → API Keys; the key
 * itself takes the form `ak_<64-hex>`.
 *
 * It travels as a standard `Authorization: Bearer <key>` header — the same
 * scheme OAuth2 uses — so `sign` here and in `auth/oauth2.ts` are identical
 * except for where the token comes from. Verified against
 * developers.salesloft.com/docs/platform/api-basics/api-key-authentication
 * ("Authorization: Bearer YOUR_API_KEY").
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a personal API key from Salesloft Account → Your Applications → API Keys. Customer accounts only — partner integrations should use OAuth instead.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Salesloft Account → Your Applications → API Keys → Create New. Takes the form ak_…",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  // GET /v2/me returns the authenticated user's own profile (name, email,
  // team) — never the credential itself — so this both proves liveness and
  // never risks echoing the key back.
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Salesloft returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return {};
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { name?: string; email?: string };
    };
    const me = body.data ?? {};
    return { user: { name: me.name ?? me.email ?? "Salesloft user", email: me.email } };
  },
};

export default apiKey;
