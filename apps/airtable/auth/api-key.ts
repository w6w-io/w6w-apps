import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Legacy API Key (`bearer`).
 *
 * **Deprecated as of Feb 2024.** Airtable disabled legacy API keys for all
 * accounts in Feb 2024 and now returns 401 for requests using them. This
 * method is retained only for archival compatibility with older workspaces
 * that already stored a key — new connections should use `personal-access-token`
 * (recommended) or `oauth2` instead.
 *
 * Wire-wise, legacy API keys were sent the same way as PATs: as a Bearer
 * token in `Authorization`.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key (Legacy)",
  description:
    "Deprecated as of Feb 2024. Airtable disabled legacy API keys — use Personal Access Token instead. Retained only for compatibility with pre-existing connections.",
  connectionLabel: "Airtable (legacy API key)",
  fields: [
    {
      key: "apiKey",
      label: "API Key (Legacy)",
      type: "secret",
      required: true,
      hint: "Legacy API keys (starting with 'key…') were disabled in Feb 2024. Use a Personal Access Token instead.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/meta/whoami`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        message:
          `Airtable returned ${res.status}. Legacy API keys were disabled in Feb 2024 — use a Personal Access Token.`,
      };
    }
    return { ok: true };
  },
};

export default apiKey;
