import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { pageQuery, paginationParams } from "../lib/params.ts";

/** `GET /v1/discounts` — filter parameter documented: `store_id`. */
interface Input {
  storeId?: string;
  pageNumber?: number;
  pageSize?: number;
}

const discountList: ActionDefinition<Input> = {
  key: "discount-list",
  type: "search",
  resource: "discount",
  title: "List Discounts",
  description: "List discount codes, optionally filtered by store.",
  params: [
    { key: "storeId", label: "Store ID", type: "string" },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Discounts" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/discounts", {
      query: { "filter[store_id]": input.storeId, ...pageQuery(input) },
    });
  },
};

export default discountList;
