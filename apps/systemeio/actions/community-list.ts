import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams, queryParam } from "../lib/params.ts";

interface Input {
  query?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const communityList: ActionDefinition<Input> = {
  key: "community-list",
  type: "read",
  resource: "community",
  title: "List Communities",
  description: "Retrieve the collection of Community resources.",
  params: [queryParam, ...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Communities" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/community/communities", compact({ ...input }));
  },
};

export default communityList;
