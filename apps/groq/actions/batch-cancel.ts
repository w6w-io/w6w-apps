import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

const batchCancel: ActionDefinition<Input> = {
  key: "batch-cancel",
  type: "perform",
  resource: "batch",
  title: "Cancel Batch",
  description: "Request cancellation of an in-progress batch.",
  idempotent: true,
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Batch ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    return client.request(`/batches/${encodeURIComponent(input.batchId)}/cancel`, {
      method: "POST",
    });
  },
};

export default batchCancel;
