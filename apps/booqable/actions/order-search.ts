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
 * `POST /orders/search` — Booqable's "advanced search" over orders, same
 * nested and/or `filter` tree as `customer-search`; verified against
 * developers.booqable.com ("Search orders").
 */
const orderSearch: ActionDefinition<Input> = {
  key: "order-search",
  type: "search",
  resource: "order",
  title: "Search Orders",
  description:
    "Advanced search across orders using a nested and/or filter tree, beyond what a flat " +
    "filter hash can express.",
  params: [
    { ...searchFilterParam, required: true, advanced: false },
    { ...includeParam, placeholder: "customer,lines,payments" },
    sortParam,
    ...paginationParams(),
  ],
  output: [{ key: "data", type: "array", label: "Matching order ids" }],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/orders/search", {
      method: "POST",
      query: { include: input.include, sort: input.sort, ...pageQuery(input) },
      body: { filter },
    });
  },
};

export default orderSearch;
