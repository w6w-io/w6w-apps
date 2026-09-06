import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

const batchGet: ActionDefinition<Input> = {
  key: "batch-get",
  type: "read",
  resource: "batch",
  title: "Get Batch Job Status",
  description: "Fetch the status of a batch embedding job.",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],
  output: [
    { key: "batch_id", type: "string", label: "Batch job ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "output_url", type: "string", label: "Signed output URL (when completed)" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    return client.request(`/v1/batch/${encodeURIComponent(input.batchId)}`);
  },
};

export default batchGet;
