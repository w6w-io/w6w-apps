import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  modelId: string;
}

/** GET /v1/models/{model_id} — `security: null` in the spec; confirmed live to need no credential. */
const modelGet: ActionDefinition<Input> = {
  key: "model-get",
  type: "read",
  resource: "model",
  title: "Get Model",
  description: "Fetch details for one model by its ID (e.g. jina-ai/jina-embeddings-v3).",
  params: [
    {
      key: "modelId",
      label: "Model ID",
      type: "string",
      required: true,
      hint: "e.g. jina-ai/jina-embeddings-v3. See models-list for the full catalog of IDs.",
    },
  ],
  requiresAuth: false,
  output: [
    { key: "id", type: "string", label: "Model ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "context_length", type: "number", label: "Context length" },
    { key: "pricing", type: "object", label: "Pricing" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    return client.request(`/v1/models/${encodeURIComponent(input.modelId)}`);
  },
};

export default modelGet;
