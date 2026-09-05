import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

const batchGet: ActionDefinition<Input> = {
  key: "batch-get",
  type: "read",
  resource: "batch",
  title: "Get Batch",
  description: "Retrieve a batch by id.",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Batch ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "output_file_id", type: "string", label: "Output file ID" },
    { key: "error_file_id", type: "string", label: "Error file ID" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    return client.request(`/batches/${encodeURIComponent(input.batchId)}`);
  },
};

export default batchGet;
