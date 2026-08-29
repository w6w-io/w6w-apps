import type { ActionDefinition } from "@w6w/types";
import { OpenRouterClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * GET /generation?id=... — "Get request & usage metadata for a generation"
 * (confirmed against `openrouter.ai/docs/api_reference/overview` §"Querying
 * cost and stats" and the `/generation` operation + `GenerationResponse`
 * schema in `openrouter.ai/openapi.json`).
 *
 * `id` is the `id` field returned by `chat-completion` (or `embeddings`). This
 * is the documented way to audit exact cost/token counts after the fact —
 * `total_cost`, native provider token counts, latency and generation time —
 * beyond what the completion's own inline `usage` block carries.
 */
const getGeneration: ActionDefinition<Input> = {
  key: "get-generation",
  type: "read",
  resource: "generation",
  title: "Get Generation",
  description: "Fetch cost and usage metadata for a past chat completion or embedding call.",
  params: [
    {
      key: "id",
      label: "Generation ID",
      type: "string",
      required: true,
      hint: 'The `id` field from a chat-completion or embeddings response, e.g. "gen-1234567890".',
    },
  ],
  output: [
    { key: "data", type: "object", label: "Generation" },
  ],

  execute(input, ctx) {
    const client = new OpenRouterClient(ctx);
    return client.request("/generation", { query: { id: input.id } });
  },
};

export default getGeneration;
