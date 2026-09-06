import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

/** GET /v1/batch/{batch_id}/errors — streams the job's error JSONL. See batch-output-get. */
const batchErrorsGet: ActionDefinition<Input> = {
  key: "batch-errors-get",
  type: "read",
  resource: "batch",
  title: "Download Batch Errors",
  description: "Download the error JSONL file for a completed batch embedding job.",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],
  output: [
    { key: "jsonl", type: "string", label: "Raw JSONL errors" },
  ],

  async execute(input, ctx) {
    const client = new JinaClient(ctx);
    const jsonl = await client.request<string>(
      `/v1/batch/${encodeURIComponent(input.batchId)}/errors`,
      { asText: true },
    );
    return { jsonl };
  },
};

export default batchErrorsGet;
