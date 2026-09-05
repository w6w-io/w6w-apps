import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { pageQuery, paginationParams } from "../lib/params.ts";

/** `GET /v1/checkouts` — filter parameters documented: `store_id`, `variant_id`. */
interface Input {
  storeId?: string;
  variantId?: string;
  pageNumber?: number;
  pageSize?: number;
}

const checkoutList: ActionDefinition<Input> = {
  key: "checkout-list",
  type: "search",
  resource: "checkout",
  title: "List Checkouts",
  description: "List custom checkouts, optionally filtered by store or variant.",
  params: [
    { key: "storeId", label: "Store ID", type: "string" },
    { key: "variantId", label: "Variant ID", type: "string" },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Checkouts" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/checkouts", {
      query: {
        "filter[store_id]": input.storeId,
        "filter[variant_id]": input.variantId,
        ...pageQuery(input),
      },
    });
  },
};

export default checkoutList;
