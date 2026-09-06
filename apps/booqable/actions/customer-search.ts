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
 * `POST /customers/search` — Booqable's "advanced search": a POST body
 * carrying an arbitrary nested `filter` boolean tree, verified against the
 * docs' own worked example (`{"filter":{"conditions":{"operator":"and",
 * "attributes":[...]}}}`), returning only `{ data: [{ id }] }` unless `fields`
 * widens the response — left as a minimal id list here since a caller can
 * follow up with `customer-get` for full attributes.
 */
const customerSearch: ActionDefinition<Input> = {
  key: "customer-search",
  type: "search",
  resource: "customer",
  title: "Search Customers",
  description:
    "Advanced search across customers using a nested and/or filter tree, beyond what a flat " +
    "filter hash can express.",
  params: [
    { ...searchFilterParam, required: true, advanced: false },
    { ...includeParam, placeholder: "barcode,payment_methods,properties,tax_region" },
    sortParam,
    ...paginationParams(),
  ],
  output: [{ key: "data", type: "array", label: "Matching customer ids" }],

  execute(input, ctx) {
    const filter = asOptionalJson<Record<string, unknown>>(input.filter, "filter");
    return new BooqableClient(ctx).request("/customers/search", {
      method: "POST",
      query: { include: input.include, sort: input.sort, ...pageQuery(input) },
      body: { filter },
    });
  },
};

export default customerSearch;
