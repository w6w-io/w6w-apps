import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

/** `GET /products/{id}` — public, no credentials required. */
interface Input {
  productId: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Retrieve a product by ID. Public — works even without a live connection.",
  requiresAuth: false,
  params: [productIdParam],
  output: [{ key: "data", type: "object", label: "The product" }],

  execute(input, ctx) {
    return new WhopClient(ctx).get(`/products/${encodeURIComponent(input.productId)}`);
  },
};

export default productGet;
