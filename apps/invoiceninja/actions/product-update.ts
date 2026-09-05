import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { productOutput } from "../lib/params.ts";

interface Input {
  productId: string;
  notes?: string;
  cost?: number;
  price?: number;
  quantity?: number;
}

/** `PUT /api/v1/products/{id}` — verified against `updateProduct` and `ProductRequest`. */
const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product",
  description: "Update a product. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
    { key: "notes", label: "Description", type: "text" },
    { key: "price", label: "Price", type: "number", row: "money" },
    { key: "cost", label: "Cost", type: "number", advanced: true, row: "money" },
    { key: "quantity", label: "Default quantity", type: "number", advanced: true },
  ],
  output: productOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/products/${input.productId}`, {
      method: "PUT",
      body: {
        notes: unset(input.notes),
        cost: input.cost,
        price: input.price,
        quantity: input.quantity,
      },
    });
  },
};

export default productUpdate;
