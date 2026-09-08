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
 * `GET /stock_items` — verified against developers.booqable.com ("List
 * stock_items"). A stock item is one physical unit behind a (trackable or
 * bulk) product — `identifier`, `status` (`in_stock`, and other lifecycle
 * states), `product_id`, `location_id`. Filterable on `archived`, `from`/
 * `till`, `identifier`, `product_id`, `location_id` and more. Includable:
 * `product`, `barcode`, `location`.
 */
const stockItemList: ActionDefinition<Input> = {
  key: "stock-item-list",
  type: "read",
  resource: "stock-item",
  title: "List Stock Items",
  description: "List individually tracked stock items, optionally filtered, sorted and paged.",
  params: [
    { ...filterParam, hint: filterParam.hint + " Filterable: product_id, location_id, status." },
    { ...includeParam, placeholder: "product,barcode,location" },
    sortParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Stock items" },
    { key: "meta", type: "object", label: "Response metadata" },
  ],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/stock_items", {
      query: {
        ...flattenFilter(filter),
        include: input.include,
        sort: input.sort,
        ...pageQuery(input),
      },
    });
  },
};

export default stockItemList;
