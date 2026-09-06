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
 * `GET /products` — verified against developers.booqable.com ("List
 * products"). A `Product` is one rentable variant under a `ProductGroup` —
 * see `product-create`'s note. Filterable on `product_group_id`,
 * `product_type`, `tracking_type`, `price_type`, `archived`, `sku`, `q`
 * (free-text) and more. Includable: `barcode`, `inventory_levels`, `photo`,
 * `price_structure`, `price_tiles`, `product_group`, `properties`,
 * `tax_category`.
 */
const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "read",
  resource: "product",
  title: "List Products",
  description: "List rentable product variants, optionally filtered, sorted and paged.",
  params: [
    filterParam,
    { ...includeParam, placeholder: "product_group,photo,inventory_levels" },
    sortParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Products" },
    { key: "meta", type: "object", label: "Response metadata" },
  ],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/products", {
      query: {
        ...flattenFilter(filter),
        include: input.include,
        sort: input.sort,
        ...pageQuery(input),
      },
    });
  },
};

export default productList;
