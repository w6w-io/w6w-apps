import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

/**
 * DELETE /v1/messages/batches/{id} — permanently remove a batch. Only allowed
 * once the batch has ended.
 */
const batchDelete: ActionDefinition<Input> = {
  key: "batch-delete",
  type: "perform",
  resource: "batch",
  title: "Delete Message Batch",
  description: "Permanently delete an ended Message Batch.",
  idempotent: true,
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request(`/v1/messages/batches/${input.batchId}`, { method: "DELETE" });
  },
};

export default batchDelete;
