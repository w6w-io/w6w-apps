import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  productGroupId: string;
  name?: string;
  priceType?: "none" | "fixed" | "simple" | "structure" | "private_structure";
  pricePeriod?: string;
  flatFeePriceInCents?: number;
  depositInCents?: number;
  description?: string;
  sku?: string;
  taxCategoryId?: string;
  tagList?: string;
  discountable?: boolean;
  taxable?: boolean;
  showInStore?: boolean;
}

/**
 * `PUT /product_groups/{id}` — verified against developers.booqable.com
 * ("Update a product group"). `product_type` and `tracking_type` are left out
 * of the update surface: the docs note changing either affects availability
 * and can trigger a shortage warning, and changing `has_variations` has
 * one-way constraints once variations exist — safer to require those changes
 * happen in Booqable directly.
 */
const productGroupUpdate: ActionDefinition<Input> = {
  key: "product-group-update",
  type: "perform",
  resource: "product-group",
  title: "Update Product Group",
  description: "Update fields on an existing product group. Only fields you set are changed.",
  idempotent: true,
  params: [
    { key: "productGroupId", label: "Product Group ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "priceType",
      label: "Price type",
      type: "select",
      options: [
        { value: "none", label: "None — free" },
        { value: "fixed", label: "Fixed price" },
        { value: "simple", label: "Simple — price × price_period" },
        { value: "structure", label: "Price structure (tiered)" },
        { value: "private_structure", label: "Private price structure" },
      ],
      advanced: true,
    },
    {
      key: "pricePeriod",
      label: "Price period",
      type: "string",
      placeholder: "day",
      advanced: true,
    },
    {
      key: "flatFeePriceInCents",
      label: "Flat fee price (cents)",
      type: "number",
      advanced: true,
    },
    { key: "depositInCents", label: "Deposit (cents)", type: "number", advanced: true },
    { key: "description", label: "Description", type: "text", advanced: true },
    { key: "sku", label: "SKU", type: "string", advanced: true },
    { key: "taxCategoryId", label: "Tax category ID", type: "string", advanced: true },
    {
      key: "tagList",
      label: "Tags",
      type: "string",
      hint: "Comma-separated, case-insensitive tags. Replaces the existing list.",
      advanced: true,
    },
    { key: "discountable", label: "Discountable", type: "boolean", advanced: true },
    { key: "taxable", label: "Taxable", type: "boolean", advanced: true },
    { key: "showInStore", label: "Show in online store", type: "boolean", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The updated ProductGroup object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/product_groups/${input.productGroupId}`, {
      method: "PUT",
      body: jsonApiBody("product_groups", {
        name: input.name,
        price_type: input.priceType,
        price_period: input.pricePeriod,
        flat_fee_price_in_cents: input.flatFeePriceInCents,
        deposit_in_cents: input.depositInCents,
        description: input.description,
        sku: input.sku,
        tax_category_id: input.taxCategoryId,
        tag_list: input.tagList ? input.tagList.split(",").map((s) => s.trim()) : undefined,
        discountable: input.discountable,
        taxable: input.taxable,
        show_in_store: input.showInStore,
      }, input.productGroupId),
    });
  },
};

export default productGroupUpdate;
