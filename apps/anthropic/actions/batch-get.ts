import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

/**
 * GET /v1/messages/batches/{id} — poll a batch's `processing_status`
 * (`in_progress` | `canceling` | `ended`) and per-request counts.
 */
const batchGet: ActionDefinition<Input> = {
  key: "batch-get",
  type: "read",
  resource: "batch",
  title: "Get Message Batch",
  description: "Retrieve status and per-request counts for a Message Batch.",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request(`/v1/messages/batches/${input.batchId}`);
  },
};

export default batchGet;
