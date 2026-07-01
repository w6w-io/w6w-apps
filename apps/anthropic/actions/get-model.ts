import type { ActionDefinition } from "@w6w/types";
import { AnthropicClient } from "../lib/client.ts";

interface Input {
  modelId: string;
}

/**
 * GET /v1/models/{id} — fetch metadata for a single model (display name,
 * created_at, type).
 */
const getModel: ActionDefinition<Input> = {
  key: "get-model",
  type: "read",
  resource: "model",
  title: "Get Model",
  description: "Retrieve metadata for a single Claude model.",
  params: [
    {
      key: "modelId",
      label: "Model ID",
      type: "string",
      required: true,
      hint: "e.g. claude-opus-4-1-20250805.",
    },
  ],

  async execute(input, ctx) {
    const client = new AnthropicClient(ctx);
    return client.request(`/v1/models/${input.modelId}`);
  },
};

export default getModel;
