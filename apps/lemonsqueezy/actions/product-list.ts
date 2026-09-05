import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam, pageQuery, paginationParams } from "../lib/params.ts";

/** `GET /v1/products` — filter parameter documented: `store_id`. */
interface Input {
  storeId?: string;
  include?: string;
  pageNumber?: number;
  pageSize?: number;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List products, optionally filtered by store.",
  params: [
    { key: "storeId", label: "Store ID", type: "string", hint: "Filter to one store." },
    includeParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Products" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/products", {
      query: { "filter[store_id]": input.storeId, include: input.include, ...pageQuery(input) },
    });
  },
};

export default productList;
