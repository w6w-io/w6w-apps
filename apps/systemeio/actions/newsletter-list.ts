import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams, queryParam } from "../lib/params.ts";

interface Input {
  query?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const newsletterList: ActionDefinition<Input> = {
  key: "newsletter-list",
  type: "read",
  resource: "newsletter",
  title: "List Newsletters",
  description: "Retrieve the collection of one-off Newsletter resources.",
  params: [queryParam, ...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Newsletters" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/mailing/newsletters", compact({ ...input }));
  },
};

export default newsletterList;
