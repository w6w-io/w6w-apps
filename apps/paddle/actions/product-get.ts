import type { ActionDefinition } from "@w6w/types";
import { PaddleClient } from "../lib/client.ts";

/** `GET /products/{product_id}` — one product, optionally with its prices. */
interface Input {
  productId: string;
  includePrices?: boolean;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch a single product by its Paddle ID.",
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      required: true,
      placeholder: "pro_01gsz4t5hdjse780zja8vvr7jg",
      validation: { pattern: "^pro_[a-z0-9]{26}$" },
    },
    { key: "includePrices", label: "Include prices", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "Product" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(`/products/${encodeURIComponent(input.productId)}`, {
      query: { include: input.includePrices ? "prices" : undefined },
    });
  },
};

export default productGet;
