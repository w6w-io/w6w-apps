import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams, sortParam, testmodeParam } from "../lib/params.ts";

interface Input {
  from?: string;
  limit?: number;
  sort?: "asc" | "desc";
  testmode?: boolean;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "Retrieve a cursor-paginated list of customers.",
  params: [...paginationParams(), sortParam, testmodeParam],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Customers" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/customers",
      compact({ from: input.from, limit: input.limit, sort: input.sort, testmode: input.testmode }),
    );
    return { count: unwrapList(body, "customers").length, items: unwrapList(body, "customers") };
  },
};

export default customerList;
