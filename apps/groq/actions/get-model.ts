import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

interface Input {
  model: string;
}

const getModel: ActionDefinition<Input> = {
  key: "get-model",
  type: "read",
  resource: "model",
  title: "Get Model",
  description: "Retrieve details for a single model by id.",
  params: [
    { key: "model", label: "Model ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Model ID" },
    { key: "owned_by", type: "string", label: "Owned by" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    return client.request(`/models/${encodeURIComponent(input.model)}`);
  },
};

export default getModel;
