import type { ActionDefinition } from "@w6w/types";
import { MistralClient } from "../lib/client.ts";

/**
 * GET /v1/models — list every model the API key has access to. Useful for
 * populating dropdowns in downstream steps.
 */
const listModels: ActionDefinition<Record<string, never>> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Models",
  description: "List all Mistral models available to this API key.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Models" },
  ],

  async execute(_input, ctx) {
    const client = new MistralClient(ctx);
    return client.request("/v1/models");
  },
};

export default listModels;
