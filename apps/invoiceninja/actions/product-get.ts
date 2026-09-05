import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { productOutput } from "../lib/params.ts";

interface Input {
  productId: string;
}

/** `GET /api/v1/products/{id}` — verified against `showProduct`. */
const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Retrieve a single product by hashed ID.",
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
  ],
  output: productOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/products/${input.productId}`);
  },
};

export default productGet;
