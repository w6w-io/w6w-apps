import type { ActionDefinition } from "@w6w/types";
import { OpenRouterClient } from "../lib/client.ts";

interface Input {
  model: string;
  input: string | string[] | unknown;
  dimensions?: number;
  encodingFormat?: "float" | "base64";
}

/**
 * POST /embeddings — "Submit an embedding request" (confirmed against
 * `openrouter.ai/docs/api_reference/embeddings` and the `/embeddings`
 * operation in `openrouter.ai/openapi.json`). Routed the same way as chat
 * completions: one endpoint, model id picks the provider.
 *
 * `input` also accepts the multimodal `{ content: [{ type: "text" | "image_url", … }] }`
 * shape for models that embed images, which is why it stays a raw JSON field
 * rather than a plain string param.
 */
const embeddings: ActionDefinition<Input> = {
  key: "embeddings",
  type: "perform",
  resource: "embedding",
  title: "Create Embeddings",
  description: "Generate vector embeddings for text (or, on supporting models, images).",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "openai/text-embedding-3-small",
      hint: "`provider/model`, e.g. openai/text-embedding-3-small.",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      hint: "A string, an array of strings, or (for multimodal models) an array of " +
        '`{ content: [{ type: "text" | "image_url", … }] }` objects.',
    },
    {
      key: "dimensions",
      label: "Dimensions",
      type: "number",
      hint: "Number of dimensions for the output embeddings, if the model supports truncation.",
    },
    {
      key: "encodingFormat",
      label: "Encoding format",
      type: "select",
      options: [
        { value: "float", label: "Float array" },
        { value: "base64", label: "Base64" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Embeddings" },
    { key: "model", type: "string", label: "Model used" },
    { key: "usage", type: "object", label: "Usage" },
  ],

  execute(input, ctx) {
    const client = new OpenRouterClient(ctx);
    const body: Record<string, unknown> = { model: input.model, input: input.input };
    if (input.dimensions !== undefined) body.dimensions = input.dimensions;
    if (input.encodingFormat !== undefined) body.encoding_format = input.encodingFormat;

    return client.request("/embeddings", { method: "POST", body });
  },
};

export default embeddings;
