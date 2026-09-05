import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  externalProductIds?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `GET /products` — list products from the store's product catalog. Scope:
 * `read_products`. Response envelope: `{"products": [...], "next_cursor", "previous_cursor"}`.
 */
const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "read",
  resource: "product",
  title: "List Products",
  description: "List products from the store's product catalog.",
  params: [
    {
      key: "externalProductIds",
      label: "External product IDs",
      type: "string",
      hint: "Comma-separated ids in the connected ecommerce platform.",
    },
    ...paginationParams(50),
  ],
  output: [
    { key: "items", type: "array", label: "Products" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/products", "products", {
      query: compact({
        external_product_ids: input.externalProductIds,
        limit: input.limit,
        cursor: input.cursor,
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default productList;
