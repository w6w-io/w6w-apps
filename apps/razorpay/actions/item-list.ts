import { compact, RazorpayClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/items` — a paginated list of catalog items. */
interface Input {
  count?: number;
  skip?: number;
}

const itemList: ActionDefinition<Input> = {
  key: "item-list",
  type: "search",
  resource: "item",
  title: "List Items",
  description: "Retrieve all catalog items.",
  params: paginationParams(),
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Items" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      "/items",
      compact({ count: input.count, skip: input.skip }),
    );
  },
};

export default itemList;
