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
 * `GET /customers` — verified against developers.booqable.com ("List
 * customers"). Filterable on `archived`, `email`, `name`, `tag_list`,
 * `tax_region_id`, `deposit_type`, `legal_type`, `number`, `order_count`,
 * `revenue_in_cents`, `created_at`/`updated_at` and more — see the docs'
 * Filters table for the full, per-field operator list. Includable relations:
 * `barcode`, `payment_methods`, `properties`, `tax_region`.
 */
const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description: "List customers, optionally filtered, sorted, sideloaded and paged.",
  params: [
    { ...filterParam, hint: filterParam.hint + " Filterable: archived, email, name, tag_list." },
    { ...includeParam, placeholder: "barcode,payment_methods,properties,tax_region" },
    sortParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Customers" },
    { key: "meta", type: "object", label: "Response metadata" },
  ],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/customers", {
      query: {
        ...flattenFilter(filter),
        include: input.include,
        sort: input.sort,
        ...pageQuery(input),
      },
    });
  },
};

export default customerList;
