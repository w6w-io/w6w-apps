import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams, queryParam } from "../lib/params.ts";

interface Input {
  query?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Email Campaigns",
  description: "Retrieve the collection of automated email Campaign resources.",
  params: [queryParam, ...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Campaigns" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/mailing/campaigns", compact({ ...input }));
  },
};

export default campaignList;
