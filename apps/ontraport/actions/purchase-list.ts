import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { type CollectionInput, collectionParams, collectionQuery } from "../lib/params.ts";

/**
 * `GET /1/Purchases` — a collection of purchases (one line item per product
 * purchased, distinct from an order or a transaction).
 *
 * Read-only: the Accessible Objects table grants only GET for Purchase (17).
 */
type Input = CollectionInput;

const purchaseList: ActionDefinition<Input> = {
  key: "purchase-list",
  type: "search",
  resource: "purchase",
  title: "List Purchases",
  description: "Retrieve a collection of purchases, filtered, sorted and paginated.",
  params: collectionParams,
  output: [{ key: "items", type: "array", label: "Purchases" }],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/Purchases", {
      query: collectionQuery(input),
    });
    return { items, count };
  },
};

export default purchaseList;
