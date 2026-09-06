import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  model: string;
  input: unknown;
  task?: string;
  dimensions?: number;
  embedding_type?: string;
  truncate?: boolean;
  normalized?: boolean;
  late_chunking?: boolean;
}

/**
 * POST /v1/embeddings — the wire body is a discriminated union of eleven
 * per-model request schemas (keyed on `model`), but every one of them shares
 * `model` + `input` as the only required fields, and the optional extras below
 * are additive across all eleven: a field a chosen model doesn't recognize is
 * simply omitted rather than guessed at, since only fields the caller actually
 * set are sent.
 *
 * `task` is model-dependent (`retrieval.query`, `retrieval.passage`,
 * `text-matching`, `classification`, `separation`, `code.query`, `code.passage`
 * — see Jina's model docs for which apply to which model) and left as free text
 * rather than a fixed enum for that reason.
 */
const embeddingsCreate: ActionDefinition<Input> = {
  key: "embeddings-create",
  type: "perform",
  resource: "embedding",
  idempotent: true,
  title: "Create Embeddings",
  description: "Generate dense, multi-vector or sparse embeddings for text, images or PDFs.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "jina-embeddings-v3",
      hint: "e.g. jina-embeddings-v3, jina-embeddings-v4, jina-embeddings-v5-text-small, " +
        "jina-embeddings-v5-text-nano, jina-clip-v2, jina-colbert-v2, jina-code-embeddings-1.5b, " +
        "elser-v2. See GET /v1/models (the models-list action) for the full, current catalog.",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint: 'A string, `{"text": "..."}`, `{"image": "<url or base64>"}`, or an array of these. ' +
        'PDFs (`{"pdf": ...}`) must be sent one at a time, not inside an array. Only ' +
        "multimodal models (jina-clip-v2, jina-embeddings-v4) accept image/PDF input.",
    },
    {
      key: "task",
      label: "Task",
      type: "string",
      hint: "Optimizes the embedding for how it will be used, e.g. retrieval.query, " +
        "retrieval.passage, text-matching, classification, separation. Model-dependent.",
    },
    {
      key: "dimensions",
      label: "Dimensions",
      type: "number",
      hint: "Truncate the output vector to this many dimensions (Matryoshka models only).",
    },
    {
      key: "embedding_type",
      label: "Embedding type",
      type: "select",
      options: [
        { label: "float (default)", value: "float" },
        { label: "base64", value: "base64" },
        { label: "binary", value: "binary" },
        { label: "ubinary", value: "ubinary" },
      ],
      hint: "Output encoding. Defaults to float arrays when left unset.",
    },
    {
      key: "truncate",
      label: "Truncate",
      type: "boolean",
      default: false,
      hint: "Silently truncate input exceeding the model's token limit instead of erroring.",
    },
    {
      key: "normalized",
      label: "L2-normalize",
      type: "boolean",
      hint:
        "L2-normalize output vectors to unit length. Defaults to true on models that support it.",
    },
    {
      key: "late_chunking",
      label: "Late chunking",
      type: "boolean",
      hint: "jina-embeddings-v3/v4 only: embed long input as one context, then pool per-chunk.",
    },
  ],
  output: [
    { key: "model", type: "string", label: "Model used" },
    { key: "data", type: "array", label: "Embeddings, one per input item" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    const body: Record<string, unknown> = { model: input.model, input: input.input };
    if (input.task !== undefined) body.task = input.task;
    if (input.dimensions !== undefined) body.dimensions = input.dimensions;
    if (input.embedding_type !== undefined) body.embedding_type = input.embedding_type;
    if (input.truncate !== undefined) body.truncate = input.truncate;
    if (input.normalized !== undefined) body.normalized = input.normalized;
    if (input.late_chunking !== undefined) body.late_chunking = input.late_chunking;
    return client.request("/v1/embeddings", { method: "POST", body });
  },
};

export default embeddingsCreate;
