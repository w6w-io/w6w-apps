import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { customerIdParam, paginationParams, sortParam, testmodeParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  from?: string;
  limit?: number;
  sort?: "asc" | "desc";
  testmode?: boolean;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "search",
  resource: "subscription",
  title: "List Customer Subscriptions",
  description: "Retrieve a cursor-paginated list of subscriptions for one customer.",
  params: [customerIdParam(), ...paginationParams(), sortParam, testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Subscriptions" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      `/customers/${encodeURIComponent(input.customerId)}/subscriptions`,
      compact({ from: input.from, limit: input.limit, sort: input.sort, testmode: input.testmode }),
    );
    return {
      count: unwrapList(body, "subscriptions").length,
      items: unwrapList(body, "subscriptions"),
    };
  },
};

export default subscriptionList;
