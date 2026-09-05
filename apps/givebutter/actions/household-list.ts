import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
}

const householdList: ActionDefinition<Input> = {
  key: "household-list",
  type: "read",
  resource: "household",
  title: "List Households",
  description: "List all households on the connected account.",
  params: [...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Households" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/households", {
      query: paginationQuery(input),
    }) as PageEnvelope<unknown>;
  },
};

export default householdList;
