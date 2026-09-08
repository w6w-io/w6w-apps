import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

/** GET /v1/models — `security: null` in the spec; confirmed live to need no credential. */
const modelsList: ActionDefinition<Record<string, never>> = {
  key: "models-list",
  type: "read",
  resource: "model",
  title: "List Models",
  description:
    "List every model available on the Search Foundation API, with pricing and modalities.",
  params: [],
  requiresAuth: false,
  output: [
    { key: "data", type: "array", label: "Models" },
  ],

  execute(_input, ctx) {
    const client = new JinaClient(ctx);
    return client.request("/v1/models");
  },
};

export default modelsList;
