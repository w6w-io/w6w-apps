import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { type CollectionInput, collectionParams, collectionQuery } from "../lib/params.ts";

/** `GET /1/Orders` — a collection of orders. */
type Input = CollectionInput;

const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "search",
  resource: "order",
  title: "List Orders",
  description: "Retrieve a collection of orders, filtered, sorted and paginated.",
  params: collectionParams,
  output: [{ key: "items", type: "array", label: "Orders" }],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/Orders", {
      query: collectionQuery(input),
    });
    return { items, count };
  },
};

export default orderList;
