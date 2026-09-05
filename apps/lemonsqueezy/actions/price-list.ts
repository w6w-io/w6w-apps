import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { pageQuery, paginationParams } from "../lib/params.ts";

/**
 * `GET /v1/prices` — filter parameter documented: `variant_id`.
 *
 * Prices have no create/update endpoint in this API — a new price object is
 * created automatically whenever a variant's price is changed in the
 * dashboard, and old prices are retained. See the README's "Deliberately not
 * shipped" section.
 */
interface Input {
  variantId?: string;
  pageNumber?: number;
  pageSize?: number;
}

const priceList: ActionDefinition<Input> = {
  key: "price-list",
  type: "search",
  resource: "price",
  title: "List Prices",
  description: "List prices, optionally filtered by variant.",
  params: [
    { key: "variantId", label: "Variant ID", type: "string", hint: "Filter to one variant." },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Prices" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/prices", {
      query: { "filter[variant_id]": input.variantId, ...pageQuery(input) },
    });
  },
};

export default priceList;
