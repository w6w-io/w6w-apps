import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Input {
  inputFileId: string;
  completionWindow: string;
  metadata?: Record<string, string>;
}

/**
 * POST /batches — Groq's `endpoint` field currently accepts exactly ONE
 * value, `/v1/chat/completions` (OpenAI's Batch API also supports
 * `/v1/embeddings` and `/v1/completions`), so it is fixed here rather than
 * exposed as a choice. `completionWindow` also differs from OpenAI, which
 * only offers `24h`: Groq documents `24h` through `7d`.
 */
const batchCreate: ActionDefinition<Input> = {
  key: "batch-create",
  type: "perform",
  resource: "batch",
  title: "Create Batch",
  description: "Create and execute a batch of chat-completion requests from an uploaded file.",
  idempotent: false,
  params: [
    {
      key: "inputFileId",
      label: "Input file ID",
      type: "string",
      required: true,
      hint: "A file uploaded with purpose `batch` (see Upload File).",
    },
    {
      key: "completionWindow",
      label: "Completion window",
      type: "string",
      required: true,
      default: "24h",
      hint: "Durations from `24h` to `7d` are supported.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Optional custom key-value pairs.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Batch ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    const body: Record<string, unknown> = {
      input_file_id: input.inputFileId,
      endpoint: "/v1/chat/completions",
      completion_window: input.completionWindow,
    };
    if (input.metadata !== undefined) body.metadata = input.metadata;

    return client.request("/batches", { method: "POST", body });
  },
};

export default batchCreate;
