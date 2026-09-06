import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";

interface Input {
  productId: string;
}

/**
 * `DELETE /products/{id}` — verified against developers.booqable.com ("Archive
 * a product"). Like `customer-archive`, this is a soft archive despite the
 * verb: the documented 200 response returns the full product resource with
 * `archived: true` set, not a 204.
 */
const productArchive: ActionDefinition<Input> = {
  key: "product-archive",
  type: "perform",
  resource: "product",
  title: "Archive Product",
  description:
    "Archive a product variant. Booqable keeps the record; it stops appearing by default.",
  idempotent: true,
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "The archived Product object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/products/${input.productId}`, {
      method: "DELETE",
    });
  },
};

export default productArchive;
