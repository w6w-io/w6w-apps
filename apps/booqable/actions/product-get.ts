import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

interface Input {
  productId: string;
  include?: string;
}

/** `GET /products/{id}` — verified against developers.booqable.com ("Fetch a product"). */
const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch a single product variant by id.",
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
    { ...includeParam, placeholder: "product_group,photo,inventory_levels" },
  ],
  output: [{ key: "data", type: "object", label: "The Product object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/products/${input.productId}`, {
      query: { include: input.include },
    });
  },
};

export default productGet;
