import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

/** `GET /v1/products/:id`. */
interface Input {
  productId: string;
  include?: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Retrieve a single product by ID.",
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
    includeParam,
  ],
  output: [{ key: "data", type: "object", label: "The Product object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/products/${encodeURIComponent(input.productId)}`,
      { query: { include: input.include } },
    );
  },
};

export default productGet;
