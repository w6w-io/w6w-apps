import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

/**
 * POST /v1/messages/batches/{id}/cancel — request that a batch stop
 * processing. Requests already in flight complete; not-yet-started ones are
 * canceled. Returns the batch with `processing_status: "canceling"`.
 */
const batchCancel: ActionDefinition<Input> = {
  key: "batch-cancel",
  type: "perform",
  resource: "batch",
  title: "Cancel Message Batch",
  description: "Request cancellation of an in-progress Message Batch.",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request(`/v1/messages/batches/${input.batchId}/cancel`, { method: "POST" });
  },
};

export default batchCancel;
