import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

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

  execute(_input, ctx) {
    const client = new GroqClient(ctx);
    return client.request("/models");
  },
};

export default listModels;
