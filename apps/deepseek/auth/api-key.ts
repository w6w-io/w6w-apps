import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * DeepSeek API key (`bearer`). Mint one at
 * https://platform.deepseek.com/api_keys and paste it here. Every request
 * signs with `Authorization: Bearer <key>`.
 *
 * `test` probes `GET /models` — the cheapest scope-free call, and one that
 * does not echo the key back in its response body (the `get-user-balance`
 * endpoint is reserved for the `quota` health check instead, since it costs
 * nothing extra to keep the two questions — "is this key live" vs. "how much
 * balance is left" — on separate probes).
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key minted at https://platform.deepseek.com/api_keys.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "DeepSeek Platform → API keys → Create new API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `DeepSeek returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
