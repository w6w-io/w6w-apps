import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  productId: string;
  variationValues?: string;
  basePriceInCents?: number;
  photoId?: string;
  sortingWeight?: number;
}

/** `PUT /products/{id}` — verified against developers.booqable.com ("Update a product"). */
const productUpdate: ActionDefinition<Input> = {
  key: "product-update",
  type: "perform",
  resource: "product",
  title: "Update Product (Variant)",
  description: "Update fields on an existing product variant. Only fields you set are changed.",
  idempotent: true,
  params: [
    { key: "productId", label: "Product ID", type: "string", required: true },
    {
      key: "variationValues",
      label: "Variation values",
      type: "string",
      hint: "Comma-separated values, in the same order as the group's own `variation_fields`.",
    },
    {
      key: "basePriceInCents",
      label: "Base price (cents)",
      type: "number",
      advanced: true,
    },
    { key: "photoId", label: "Photo ID", type: "string", advanced: true },
    { key: "sortingWeight", label: "Sorting weight", type: "number", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The updated Product object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/products/${input.productId}`, {
      method: "PUT",
      body: jsonApiBody("products", {
        variation_values: input.variationValues
          ? input.variationValues.split(",").map((s) => s.trim())
          : undefined,
        base_price_in_cents: input.basePriceInCents,
        photo_id: input.photoId,
        sorting_weight: input.sortingWeight,
      }, input.productId),
    });
  },
};

export default productUpdate;
