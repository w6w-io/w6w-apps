import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  productId: string;
}

/** `DELETE /api/v1/products/{id}` — verified against `deleteProduct`. Soft delete. */
const productDelete: ActionDefinition<Input> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description: "Soft-delete a product.",
  idempotent: true,
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request(`/products/${input.productId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default productDelete;
