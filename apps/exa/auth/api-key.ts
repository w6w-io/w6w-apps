import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Exa API key. Mint one from the Exa dashboard (https://dashboard.exa.ai/api-keys).
 *
 * Every request signs with `x-api-key: <key>` — no prefix. Exa's security
 * scheme also accepts `Authorization: Bearer <key>` on the same set of
 * endpoints, but `x-api-key` is the header the docs lead with everywhere, so
 * that's what `sign` uses.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an API key minted from the Exa dashboard.",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Exa dashboard → API Keys.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /v0/teams/me` — team name/id plus concurrency usage and limits.
   * Chosen over a live `/search` (the obvious "does this work?" call) because
   * every `/search` call is billed ($0.007–$0.015 per Exa's own
   * `x-payment-info`, verified in the OpenAPI spec's `/search` operation) —
   * spending real money on every connect-time probe and every background
   * health check would be a surprising cost. Team info needs no scope beyond
   * an authenticated key, is not billed per the vendor's pricing docs (it's an
   * account-metadata read, not a search/contents/answer operation), and its
   * response body (`object`, `id`, `name`, `concurrency`, `limits`) never
   * echoes the key back.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/v0/teams/me`, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string; tag?: string } | null;
      const detail = body?.tag ? ` (${body.tag}${body.error ? `: ${body.error}` : ""})` : "";
      return { ok: false, message: `Exa returned ${res.status}${detail}` };
    }
    return { ok: true };
  },
};

export default apiKey;
