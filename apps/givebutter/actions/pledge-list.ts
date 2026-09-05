import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
}

const pledgeList: ActionDefinition<Input> = {
  key: "pledge-list",
  type: "read",
  resource: "pledge",
  title: "List Pledges",
  description: "List pledges (committed future gifts) on the connected account.",
  params: [...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Pledges" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/pledges", {
      query: paginationQuery(input),
    }) as PageEnvelope<unknown>;
  },
};

export default pledgeList;
