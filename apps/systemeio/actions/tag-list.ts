import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams, queryParam } from "../lib/params.ts";

interface Input {
  query?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "Retrieve the collection of Tag resources.",
  params: [queryParam, ...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Tags" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/tags", compact({ ...input }));
  },
};

export default tagList;
