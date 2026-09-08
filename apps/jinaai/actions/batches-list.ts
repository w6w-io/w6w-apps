import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  limit?: number;
}

const batchesList: ActionDefinition<Input> = {
  key: "batches-list",
  type: "read",
  resource: "batch",
  title: "List Batch Jobs",
  description: "List recent batch embedding jobs for the authenticated account.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 20 },
  ],
  output: [
    { key: "batches", type: "array", label: "Batch jobs" },
  ],

  async execute(input, ctx) {
    const client = new JinaClient(ctx);
    const batches = await client.request("/v1/batches", { query: { limit: input.limit } });
    return { batches };
  },
};

export default batchesList;
