import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  model: string;
  inputUrl?: string;
  input?: unknown;
  task?: string;
  dimensions?: number;
  normalized?: boolean;
  webhookUrl?: string;
}

/**
 * POST /v1/batch/embeddings — starts an async bulk embedding job. Either
 * `input_url` (a JSONL file already sitting in GCS/S3/HTTP) or `input`
 * (inline JSONL lines, for small batches) must be given, per the vendor's own
 * field description — never both, never neither.
 */
const batchEmbeddingsCreate: ActionDefinition<Input> = {
  key: "batch-embeddings-create",
  type: "perform",
  resource: "batch",
  idempotent: false,
  title: "Create Batch Embedding Job",
  description: "Start an asynchronous bulk embedding job from inline JSONL or a JSONL file URL.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "jina-embeddings-v3",
      hint: "The embedding model to run the whole batch with.",
    },
    {
      key: "inputUrl",
      label: "Input file URL",
      type: "string",
      hint: "URL to a JSONL file (GCS, S3, or plain HTTP). Give this OR Inline input, not both.",
    },
    {
      key: "input",
      label: "Inline input",
      type: "json",
      hint:
        "Array of JSONL-line objects, for small batches. Give this OR Input file URL, not both.",
    },
    {
      key: "task",
      label: "Task",
      type: "string",
      default: "text-matching",
      hint: "retrieval.query, retrieval.passage, text-matching, clustering, or classification.",
    },
    {
      key: "dimensions",
      label: "Dimensions",
      type: "number",
      hint: "1-1024. Truncate output vectors to this many dimensions.",
    },
    {
      key: "normalized",
      label: "L2-normalize",
      type: "boolean",
      default: true,
      hint: "L2-normalize embeddings to unit length.",
    },
    {
      key: "webhookUrl",
      label: "Webhook URL",
      type: "string",
      hint: "POST a notification here when the job completes.",
    },
  ],
  output: [
    { key: "batch_id", type: "string", label: "Batch job ID" },
    { key: "status", type: "string", label: "Job status" },
  ],

  execute(input, ctx) {
    if (!input.inputUrl && input.input === undefined) {
      throw new Error(
        "batch-embeddings-create: either `inputUrl` or `input` is required",
      );
    }
    const client = new JinaClient(ctx);
    const body: Record<string, unknown> = { model: input.model };
    if (input.inputUrl !== undefined) body.input_url = input.inputUrl;
    if (input.input !== undefined) body.input = input.input;
    if (input.task !== undefined) body.task = input.task;
    if (input.dimensions !== undefined) body.dimensions = input.dimensions;
    if (input.normalized !== undefined) body.normalized = input.normalized;
    if (input.webhookUrl !== undefined) body.webhook_url = input.webhookUrl;
    return client.request("/v1/batch/embeddings", { method: "POST", body });
  },
};

export default batchEmbeddingsCreate;
