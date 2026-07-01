import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface BatchRequest {
  custom_id: string;
  params: Record<string, unknown>;
}

interface Input {
  requests: BatchRequest[];
}

/**
 * POST /v1/messages/batches — submit up to 100k `/v1/messages` requests for
 * async processing. Message Batches is GA (2026-07); no beta header required.
 * Each element carries a caller-supplied `custom_id` so results (JSONL) can be
 * matched back to inputs when they arrive out of order.
 */
const batchCreate: ActionDefinition<Input> = {
  key: "batch-create",
  type: "perform",
  resource: "batch",
  title: "Create Message Batch",
  description: "Submit a batch of Message creation requests for async processing.",
  params: [
    {
      key: "requests",
      label: "Requests",
      type: "json",
      required: true,
      hint: "Array of `{ custom_id, params }` — `params` uses the same shape as `/v1/messages`.",
    },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request("/v1/messages/batches", {
      method: "POST",
      body: { requests: input.requests },
    });
  },
};

export default batchCreate;
