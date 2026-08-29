import type { ActionDefinition } from "@w6w/types";
import { OpenRouterClient } from "../lib/client.ts";

/**
 * GET /credits — "Get remaining credits": total credits purchased and used for
 * the whole account (confirmed against the `/credits` operation in
 * `openrouter.ai/openapi.json`).
 *
 * Unlike every other action in this app, OpenRouter's own docs state this
 * endpoint requires a **Management API key** — a separate key type minted at
 * https://openrouter.ai/settings/provisioning-keys, which "cannot be used to
 * make API calls to OpenRouter's completion endpoints" (per
 * `openrouter.ai/docs/guides/overview/auth/management-api-keys`). It is still
 * a Bearer token on the same `Authorization` header, so this app's single
 * `api-key` Auth method covers it — but a Connection made with a regular
 * inference key will get a 401/403 from this one action specifically. Use
 * `get-key-info` instead for the connected key's own usage/limit, which works
 * with a regular key.
 */
const getCredits: ActionDefinition<Record<string, never>> = {
  key: "get-credits",
  type: "read",
  resource: "credits",
  title: "Get Credits",
  description:
    "Get total account credits purchased and used. Requires a Management API key connection " +
    "(see this app's README) — a regular inference key is rejected here.",
  params: [],
  output: [
    { key: "data", type: "object", label: "Credits" },
  ],

  execute(_input, ctx) {
    const client = new OpenRouterClient(ctx);
    return client.request("/credits");
  },
};

export default getCredits;
