import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

const batchCancel: ActionDefinition<Input> = {
  key: "batch-cancel",
  type: "perform",
  resource: "batch",
  idempotent: true,
  title: "Cancel Batch Job",
  description: "Cancel a pending or in-progress batch embedding job.",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],
  output: [
    { key: "batch_id", type: "string", label: "Batch job ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    return client.request(`/v1/batch/${encodeURIComponent(input.batchId)}`, { method: "DELETE" });
  },
};

export default batchCancel;
