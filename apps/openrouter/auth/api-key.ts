import type { AuthDefinition } from "@w6w/types";
import { API_URL, extractError } from "../lib/client.ts";

/**
 * OpenRouter API key (`bearer`). Mint one at https://openrouter.ai/keys and
 * paste it here. Every request signs with `Authorization: Bearer <key>` —
 * confirmed against `openrouter.ai/docs/api_reference/authentication` and the
 * `apiKey`/`bearer` security schemes in `openrouter.ai/openapi.json`
 * (`scheme: "bearer", type: "http"`), both aliasing the same Bearer check.
 *
 * ## Probe: `GET /key`
 *
 * "Get current API key" — returns usage/limit metadata for whichever key
 * authenticated the request (`GET /api/v1/key` in
 * `openrouter.ai/docs/api_reference/limits`). The response's `label` field is
 * a vendor-masked preview ("sk-or-v1-au7...890" in OpenRouter's own docs
 * example), never the raw key, so this probe cannot leak the credential it is
 * validating. It needs no scope beyond "is this a live key" and is free.
 *
 * Note: OpenRouter also mints a separate **Management API key** type (at
 * https://openrouter.ai/settings/provisioning-keys) for the `/keys`, `/credits`
 * and similar administrative endpoints — see `actions/get-credits.ts`. `/key`
 * (singular) is documented to work for "the current authentication session"
 * regardless of which key type that is, so it stays the right probe for both.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key minted at https://openrouter.ai/keys.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "OpenRouter dashboard → Keys → Create Key.",
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

    const res = await ctx.fetch(`${API_URL}/key`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) return { ok: true };
    return {
      ok: false,
      message: `OpenRouter returned ${res.status}: ${await extractError(res)}`,
    };
  },
};

export default apiKey;
