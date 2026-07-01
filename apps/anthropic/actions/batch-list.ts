import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after_id?: string;
  before_id?: string;
}

/**
 * GET /v1/messages/batches — cursor-paginated list of every Message Batch in
 * the account.
 */
const batchList: ActionDefinition<Input> = {
  key: "batch-list",
  type: "read",
  resource: "batch",
  title: "List Message Batches",
  description: "List every Message Batch in the account (paginated).",
  params: [
    { key: "limit", label: "Limit", type: "number" },
    { key: "after_id", label: "After ID (cursor)", type: "string" },
    { key: "before_id", label: "Before ID (cursor)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Batches" },
    { key: "has_more", type: "boolean", label: "Has more" },
    { key: "first_id", type: "string", label: "First ID" },
    { key: "last_id", type: "string", label: "Last ID" },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request("/v1/messages/batches", {
      query: {
        limit: input.limit,
        after_id: input.after_id,
        before_id: input.before_id,
      },
    });
  },
};

export default batchList;
