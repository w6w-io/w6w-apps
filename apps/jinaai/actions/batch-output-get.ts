import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  batchId: string;
}

/**
 * GET /v1/batch/{batch_id}/output — streams the completed job's output JSONL.
 * The spec declares the response schema as an untyped `{}` (any JSON), and
 * describes it in prose as "Stream the output JSONL file" — read as raw text
 * here since JSONL is newline-delimited JSON, not one parseable JSON document.
 */
const batchOutputGet: ActionDefinition<Input> = {
  key: "batch-output-get",
  type: "read",
  resource: "batch",
  title: "Download Batch Output",
  description: "Download the output JSONL file for a completed batch embedding job.",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],
  output: [
    { key: "jsonl", type: "string", label: "Raw JSONL output" },
  ],

  async execute(input, ctx) {
    const client = new JinaClient(ctx);
    const jsonl = await client.request<string>(
      `/v1/batch/${encodeURIComponent(input.batchId)}/output`,
      { asText: true },
    );
    return { jsonl };
  },
};

export default batchOutputGet;
