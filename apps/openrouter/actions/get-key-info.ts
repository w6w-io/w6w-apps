import type { ActionDefinition } from "@w6w/types";
import { OpenRouterClient } from "../lib/client.ts";

/**
 * GET /key — "Get current API key". Returns usage, credit limit and headroom
 * for whichever key authenticated the request (confirmed against
 * `openrouter.ai/docs/api_reference/limits` §"Checking your limits" and the
 * `/key` operation in `openrouter.ai/openapi.json`).
 *
 * This is also the documented way to check remaining credits and rate-limit
 * headroom generally: OpenRouter does not attach `X-RateLimit-*` headers to
 * successful inference responses (they only appear on a 429 rejection), so
 * this call — not response headers — is the supported way to monitor
 * `limit_remaining` proactively. `health/quota.ts` probes the same endpoint.
 *
 * The response's `label` field is a vendor-masked preview of the key (e.g.
 * "sk-or-v1-au7...890"), never the raw credential.
 */
const getKeyInfo: ActionDefinition<Record<string, never>> = {
  key: "get-key-info",
  type: "read",
  resource: "key",
  title: "Get Key Info",
  description: "Get usage, credit limit, and remaining headroom for the connected API key.",
  params: [],
  output: [
    { key: "data", type: "object", label: "Key info" },
  ],

  execute(_input, ctx) {
    const client = new OpenRouterClient(ctx);
    return client.request("/key");
  },
};

export default getKeyInfo;
