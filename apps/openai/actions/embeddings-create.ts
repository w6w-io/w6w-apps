import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Input {
  input: string | string[];
  model?: string;
  encodingFormat?: "float" | "base64";
  dimensions?: number;
  user?: string;
}

const embeddingsCreate: ActionDefinition<Input> = {
  key: "embeddings-create",
  type: "perform",
  resource: "embedding",
  title: "Create Embeddings",
  description: "Create an embedding vector for the given input text.",
  params: [
    {
      key: "input",
      label: "Input",
      type: "text",
      required: true,
      hint: "Text to embed, or a JSON array of strings.",
    },
    {
      key: "model",
      label: "Model",
      type: "string",
      default: "text-embedding-3-small",
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
    { key: "dimensions", label: "Dimensions", type: "number" },
    { key: "user", label: "User", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const body: Record<string, unknown> = {
      input: input.input,
      model: input.model ?? "text-embedding-3-small",
    };
    if (input.encodingFormat) body.encoding_format = input.encodingFormat;
    if (input.dimensions !== undefined) body.dimensions = input.dimensions;
    if (input.user) body.user = input.user;

    return client.request("/embeddings", { method: "POST", body });
  },
};

export default embeddingsCreate;
