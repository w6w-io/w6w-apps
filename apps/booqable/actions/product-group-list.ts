import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import {
  asOptionalJson,
  filterParam,
  flattenFilter,
  includeParam,
  pageQuery,
  paginationParams,
  sortParam,
} from "../lib/params.ts";

interface Input {
  filter?: string;
  include?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * `GET /product_groups` — verified against developers.booqable.com ("List
 * product groups"). A ProductGroup holds the shared name/pricing/tracking
 * configuration; the individually rentable `Product` variants underneath it
 * are managed by the `product-*` actions (see `product-create`'s note on
 * this two-level model).
 */
const productGroupList: ActionDefinition<Input> = {
  key: "product-group-list",
  type: "read",
  resource: "product-group",
  title: "List Product Groups",
  description: "List product groups, optionally filtered, sorted, sideloaded and paged.",
  params: [
    filterParam,
    { ...includeParam, placeholder: "photo,properties,tax_category,products" },
    sortParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Product groups" },
    { key: "meta", type: "object", label: "Response metadata" },
  ],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/product_groups", {
      query: {
        ...flattenFilter(filter),
        include: input.include,
        sort: input.sort,
        ...pageQuery(input),
      },
    });
  },
};

export default productGroupList;
