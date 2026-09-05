import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
}

const fundList: ActionDefinition<Input> = {
  key: "fund-list",
  type: "read",
  resource: "fund",
  title: "List Funds",
  description: "List all funds on the connected account.",
  params: [...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Funds" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/funds", {
      query: paginationQuery(input),
    }) as PageEnvelope<unknown>;
  },
};

export default fundList;
