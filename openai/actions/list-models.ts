import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

const listModels: ActionDefinition<Record<string, never>> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List every model available to the current account.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Models" },
    { key: "object", type: "string", label: "Object type" },
  ],

  async execute(_input, ctx) {
    const client = new OpenAIClient(ctx);
    return client.request("/models");
  },
};

export default listModels;
