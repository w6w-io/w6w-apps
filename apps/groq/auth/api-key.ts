import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API key (`bearer`) — the only auth method Groq's API documents: mint a
 * secret key at https://console.groq.com/keys and every request signs with
 * it as `Authorization: Bearer <key>`.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste a secret key from https://console.groq.com/keys. Starts with `gsk_`.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Console → API Keys → Create API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  // GET /openai/v1/models needs no scope beyond a valid key, and is the same
  // probe the `quota` health check reuses — one cheap, side-effect-free call
  // answers "is this credential live" for both surfaces.
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Groq returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
