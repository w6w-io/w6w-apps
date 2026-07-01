import type { AuthDefinition } from "@w6w/types";
import { ANTHROPIC_VERSION, API_URL } from "../lib/client.ts";

/**
 * Anthropic API key — modelled as `custom` because the wire format is a
 * lowercase `x-api-key` header, NOT the `Authorization: Bearer …` used by
 * every other AI vendor. If we typed this as `bearer` the runtime would flip
 * the case / rename the header and Anthropic would 401. Keep it explicit.
 *
 * The header MUST stay literally `x-api-key` (all lowercase — see the test
 * suite guarding against a well-meaning `X-Api-Key` rename).
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description:
    "Paste an API key from https://console.anthropic.com/settings/keys. Starts with `sk-ant-`.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Console → Settings → API keys → Create Key. Key starts with `sk-ant-`.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/v1/models`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
    });
    if (!res.ok) return { ok: false, message: `Anthropic returned ${res.status}` };
    // Belt-and-braces: verify the response envelope looks like a model list.
    try {
      const body = await res.json() as { data?: unknown };
      if (!Array.isArray(body.data)) {
        return { ok: false, message: "unexpected response shape from /v1/models" };
      }
    } catch {
      return { ok: false, message: "could not parse /v1/models response" };
    }
    return { ok: true };
  },
};

export default apiKey;
