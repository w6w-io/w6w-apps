import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient, parseJsonl } from "../lib/client.ts";

interface Input {
  batchId: string;
}

interface BatchResult {
  custom_id: string;
  result: unknown;
}

/**
 * GET /v1/messages/batches/{id}/results — streams the completed batch as
 * JSONL (one JSON object per line, order not guaranteed). We buffer the
 * whole body and decode it into a plain array so downstream steps can iterate
 * naturally. For very large batches callers should page results themselves.
 */
const batchResults: ActionDefinition<Input, { results: BatchResult[] }> = {
  key: "batch-results",
  type: "read",
  resource: "batch",
  title: "Get Message Batch Results",
  description: "Fetch the per-request results for a completed batch (JSONL decoded to an array).",
  params: [
    { key: "batchId", label: "Batch ID", type: "string", required: true },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    const text = await client.request<string>(
      `/v1/messages/batches/${input.batchId}/results`,
      { asText: true },
    );
    return { results: parseJsonl<BatchResult>(text) };
  },
};

export default batchResults;
