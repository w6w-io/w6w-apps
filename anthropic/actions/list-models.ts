import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after_id?: string;
  before_id?: string;
}

/**
 * GET /v1/models — cursor-paginated list of every model available to the
 * current account. Callers page by passing `after_id` (or `before_id`) from
 * the previous response.
 */
const listModels: ActionDefinition<Input> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List every Claude model available to the current API key.",
  params: [
    { key: "limit", label: "Limit", type: "number", hint: "1–1000, default 20." },
    { key: "after_id", label: "After ID (cursor)", type: "string" },
    { key: "before_id", label: "Before ID (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Models" },
    { key: "has_more", type: "boolean", label: "Has more" },
    { key: "first_id", type: "string", label: "First ID" },
    { key: "last_id", type: "string", label: "Last ID" },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request("/v1/models", {
      query: {
        limit: input.limit,
        after_id: input.after_id,
        before_id: input.before_id,
      },
    });
  },
};

export default listModels;
