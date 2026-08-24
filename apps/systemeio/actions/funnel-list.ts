import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams, queryParam } from "../lib/params.ts";

interface Input {
  query?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const funnelList: ActionDefinition<Input> = {
  key: "funnel-list",
  type: "read",
  resource: "funnel",
  title: "List Funnels",
  description: "Retrieve the collection of Funnel resources.",
  params: [queryParam, ...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Funnels" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/funnels", compact({ ...input }));
  },
};

export default funnelList;
