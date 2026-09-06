import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  name: string;
  productType?: "rental" | "sales_item" | "service";
  trackingType?: "none" | "trackable" | "bulk";
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
 * `POST /product_groups` — verified against developers.booqable.com ("Create
 * a product group"). Only a subset of the vendor's large, mostly-optional
 * body (name, type/tracking/pricing basics, tax, tags, visibility) is
 * exposed here as fixed params; less common fields (buffer times, ROI cost,
 * URL redirects, weight overrides) are left out rather than guessed at —
 * every field kept maps 1:1 to a documented attribute.
 *
 * `product_type`, `tracking_type` and `price_type` option lists are copied
 * verbatim from the docs' "Product Types" / "Tracking Types" / "Pricing
 * Types" prose. `price_period` (`hour`, `day`, confirmed in worked examples;
 * likely also `week`/`month`, not enumerated in the docs) is left free-text
 * rather than a closed `select` so a valid-but-unobserved value isn't blocked.
 */
const productGroupCreate: ActionDefinition<Input> = {
  key: "product-group-create",
  type: "perform",
  resource: "product-group",
  title: "Create Product Group",
  description:
    "Create a product group — the shared name/pricing/tracking configuration a rentable " +
    "Product (or its variations) belongs to.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "productType",
      label: "Product type",
      type: "select",
      default: "rental",
      options: [
        { value: "rental", label: "Rental — your main rentable products" },
        { value: "sales_item", label: "Sales item — sold, not expected back" },
        { value: "service", label: "Service — an optional extra, not trackable" },
      ],
    },
    {
      key: "trackingType",
      label: "Tracking type",
      type: "select",
      options: [
        { value: "none", label: "None (service, sales_item only)" },
        { value: "trackable", label: "Trackable — each stock item has its own identifier" },
        { value: "bulk", label: "Bulk — only a count is tracked" },
      ],
      advanced: true,
    },
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
      hint: "Base period for `simple` pricing, e.g. `hour`, `day`.",
      advanced: true,
    },
    {
      key: "flatFeePriceInCents",
      label: "Flat fee price (cents)",
      type: "number",
      hint: "Used when price type is `simple`.",
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
      hint: "Comma-separated, case-insensitive tags.",
      advanced: true,
    },
    { key: "discountable", label: "Discountable", type: "boolean", advanced: true },
    { key: "taxable", label: "Taxable", type: "boolean", advanced: true },
    { key: "showInStore", label: "Show in online store", type: "boolean", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The created ProductGroup object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request("/product_groups", {
      method: "POST",
      body: jsonApiBody("product_groups", {
        name: input.name,
        product_type: input.productType,
        tracking_type: input.trackingType,
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
      }),
    });
  },
};

export default productGroupCreate;
