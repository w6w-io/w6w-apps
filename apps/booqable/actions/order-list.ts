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
 * `GET /orders` — verified against developers.booqable.com ("List orders").
 * Filterable on `status`, `customer_id`, `fulfillment_type`, `payment_status`
 * (via `status`/related fields), `starts_at`/`stops_at`, `any_shortage`,
 * `tag_list`, monetary totals and more — see the docs' Filters table.
 * Includable: `customer`, `coupon`, `start_location`, `stop_location`,
 * `tax_region`, `lines`, `payments`, and more.
 */
const orderList: ActionDefinition<Input> = {
  key: "order-list",
  type: "read",
  resource: "order",
  title: "List Orders",
  description: "List orders, optionally filtered, sorted, sideloaded and paged.",
  params: [
    { ...filterParam, hint: filterParam.hint + " Filterable: status, customer_id, starts_at." },
    { ...includeParam, placeholder: "customer,lines,payments" },
    sortParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Orders" },
    { key: "meta", type: "object", label: "Response metadata" },
  ],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/orders", {
      query: {
        ...flattenFilter(filter),
        include: input.include,
        sort: input.sort,
        ...pageQuery(input),
      },
    });
  },
};

export default orderList;
