import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam, pageQuery, paginationParams, variantStatusOptions } from "../lib/params.ts";

/** `GET /v1/variants` — filter parameters documented: `product_id`, `status`. */
interface Input {
  productId?: string;
  status?: string;
  include?: string;
  pageNumber?: number;
  pageSize?: number;
}

const variantList: ActionDefinition<Input> = {
  key: "variant-list",
  type: "search",
  resource: "variant",
  title: "List Variants",
  description: "List product variants, optionally filtered by product or status.",
  params: [
    { key: "productId", label: "Product ID", type: "string", hint: "Filter to one product." },
    { key: "status", label: "Status", type: "select", options: variantStatusOptions },
    includeParam,
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Variants" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/variants", {
      query: {
        "filter[product_id]": input.productId,
        "filter[status]": input.status,
        include: input.include,
        ...pageQuery(input),
      },
    });
  },
};

export default variantList;
