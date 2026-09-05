import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

const batchList: ActionDefinition<Record<string, never>> = {
  key: "batch-list",
  type: "read",
  resource: "batch",
  title: "List Batches",
  description: "List batches belonging to the current organization.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Batches" },
    { key: "object", type: "string", label: "Object type" },
  ],

  execute(_input, ctx) {
    const client = new GroqClient(ctx);
    return client.request("/batches");
  },
};

export default batchList;
