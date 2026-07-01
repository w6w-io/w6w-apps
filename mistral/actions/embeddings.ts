import type { ActionDefinition } from "@w6w/types";
import { MistralClient } from "../lib/client.ts";

interface Input {
  model?: string;
  input: string | string[];
  encodingFormat?: "float" | "base64";
}

/**
 * POST /v1/embeddings — produces vector embeddings for one or more strings.
 * Callers can pass a single string or an array; the API returns embeddings in
 * the same order.
 */
const embeddings: ActionDefinition<Input> = {
  key: "embeddings",
  type: "perform",
  resource: "embedding",
  title: "Create Embeddings",
  description: "Generate embeddings for one or more input strings.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      default: "mistral-embed",
      required: true,
    },
    {
      key: "input",
      label: "Input",
      type: "string",
      required: true,
      repeat: true,
      hint: "One or more strings to embed.",
    },
    {
      key: "encodingFormat",
      label: "Encoding format",
      type: "select",
      options: [
        { value: "float", label: "Float" },
        { value: "base64", label: "Base64" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new MistralClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model ?? "mistral-embed",
      input: input.input,
    };
    if (input.encodingFormat) body.encoding_format = input.encodingFormat;
    return client.request("/v1/embeddings", { method: "POST", body });
  },
};

export default embeddings;
