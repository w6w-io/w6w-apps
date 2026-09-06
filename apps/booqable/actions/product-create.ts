import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  productGroupId: string;
  variationValues?: string;
  basePriceInCents?: number;
  photoId?: string;
  sortingWeight?: number;
}

/**
 * `POST /products` — verified against developers.booqable.com ("Create a
 * product"). Booqable's catalog is two-level: a `ProductGroup` holds the
 * shared name/pricing/tracking config (see `product-group-create`), and each
 * `Product` underneath it is one rentable VARIANT — even a group with no real
 * variations still has exactly one `Product` record. `product_group_id` is
 * therefore the one field every worked create example actually sets, and is
 * required here. `variation_values` supplies the values for the group's own
 * `variation_fields`, positionally (Booqable does not name them in the
 * product body) — left as a comma-separated list.
 */
const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product (Variant)",
  description:
    "Create a rentable product variant under a product group. A group with no variations still " +
    "needs exactly one of these.",
  idempotent: false,
  params: [
    {
      key: "productGroupId",
      label: "Product Group ID",
      type: "string",
      required: true,
      hint: "The ProductGroup this variant belongs to.",
    },
    {
      key: "variationValues",
      label: "Variation values",
      type: "string",
      placeholder: "red",
      hint: "Comma-separated values, in the same order as the group's own `variation_fields`.",
    },
    {
      key: "basePriceInCents",
      label: "Base price (cents)",
      type: "number",
      hint: "Writable only when the group has variations enabled; otherwise inherited from it.",
      advanced: true,
    },
    {
      key: "photoId",
      label: "Photo ID",
      type: "string",
      hint: "Must be one of the ProductGroup's own photos.",
      advanced: true,
    },
    { key: "sortingWeight", label: "Sorting weight", type: "number", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The created Product object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request("/products", {
      method: "POST",
      body: jsonApiBody("products", {
        product_group_id: input.productGroupId,
        variation_values: input.variationValues
          ? input.variationValues.split(",").map((s) => s.trim())
          : undefined,
        base_price_in_cents: input.basePriceInCents,
        photo_id: input.photoId,
        sorting_weight: input.sortingWeight,
      }),
    });
  },
};

export default productCreate;
