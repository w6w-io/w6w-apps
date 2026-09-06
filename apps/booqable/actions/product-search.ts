import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import {
  asOptionalJson,
  includeParam,
  pageQuery,
  paginationParams,
  searchFilterParam,
  sortParam,
} from "../lib/params.ts";

interface Input {
  filter: string;
  include?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * `POST /products/search` — Booqable's "advanced search" over products,
 * same nested and/or `filter` tree as `customer-search`; verified against
 * developers.booqable.com ("Search products").
 */
const productSearch: ActionDefinition<Input> = {
  key: "product-search",
  type: "search",
  resource: "product",
  title: "Search Products",
  description:
    "Advanced search across product variants using a nested and/or filter tree, beyond what a " +
    "flat filter hash can express.",
  params: [
    { ...searchFilterParam, required: true, advanced: false },
    { ...includeParam, placeholder: "product_group,photo,inventory_levels" },
    sortParam,
    ...paginationParams(),
  ],
  output: [{ key: "data", type: "array", label: "Matching product ids" }],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/products/search", {
      method: "POST",
      query: { include: input.include, sort: input.sort, ...pageQuery(input) },
      body: { filter },
    });
  },
};

export default productSearch;
