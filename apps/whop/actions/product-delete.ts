import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

/**
 * `DELETE /products/{id}` — only products with no memberships, entries,
 * reviews, or invoices can be deleted.
 */
interface Input {
  productId: string;
}

const productDelete: ActionDefinition<Input> = {
  key: "product-delete",
  type: "perform",
  resource: "product",
  title: "Delete Product",
  description: "Delete a product. Fails if it has any memberships, entries, reviews or invoices.",
  idempotent: true,
  params: [productIdParam],
  output: [
    { key: "id", type: "string", label: "Deleted product ID" },
    { key: "deleted", type: "boolean", label: "Always true" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).delete(`/products/${encodeURIComponent(input.productId)}`);
  },
};

export default productDelete;
