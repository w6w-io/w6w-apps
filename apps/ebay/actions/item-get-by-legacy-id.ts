import type { ActionDefinition } from "@w6w/types";
import { EbayClient } from "../lib/client.ts";

/**
 * Get an item by eBay's older numeric "legacy" item ID (the kind shown on
 * ebay.com listing pages and returned by the Trading/Finding APIs). Wraps
 * `GET /buy/browse/v1/item/get_item_by_legacy_id` (Buy Browse API).
 */
const action: ActionDefinition = {
  key: "item-get-by-legacy-id",
  type: "read",
  resource: "item",
  title: "Get an item by legacy ID",
  description: "Show full details for one item, by its legacy numeric eBay item ID.",
  params: [
    {
      key: "legacyItemId",
      label: "Legacy Item ID",
      type: "string",
      required: true,
      default: "",
      hint: "The numeric item ID shown on an ebay.com listing page.",
    },
    {
      key: "legacyVariationId",
      label: "Legacy Variation ID",
      type: "string",
      hint: "For a specific variation in a multi-SKU listing.",
    },
    {
      key: "legacyVariationSku",
      label: "Legacy Variation SKU",
      type: "string",
      hint: "Alternative to Legacy Variation ID, for a seller-defined SKU.",
    },
    {
      key: "marketplaceId",
      label: "Marketplace",
      type: "string",
      default: "EBAY_US",
      hint: "e.g. EBAY_US, EBAY_GB, EBAY_DE. Defaults to EBAY_US when omitted.",
    },
  ],
  output: [
    { key: "itemId", type: "string", label: "RESTful item ID" },
    { key: "legacyItemId", type: "string", label: "Legacy item ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "price", type: "object", label: "Current price" },
    { key: "condition", type: "string", label: "Condition" },
    { key: "seller", type: "object", label: "Seller summary" },
    { key: "itemWebUrl", type: "string", label: "eBay listing URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const legacyItemId = String(p.legacyItemId ?? "").trim();
    if (!legacyItemId) throw new Error("`legacyItemId` is required");
    const marketplaceId = String(p.marketplaceId ?? "EBAY_US").trim() || "EBAY_US";
    return await new EbayClient(ctx).request("/buy/browse/v1/item/get_item_by_legacy_id", {
      query: {
        legacy_item_id: legacyItemId,
        legacy_variation_id: p.legacyVariationId ? String(p.legacyVariationId) : undefined,
        legacy_variation_sku: p.legacyVariationSku ? String(p.legacyVariationSku) : undefined,
      },
      headers: { "x-ebay-c-marketplace-id": marketplaceId },
    });
  },
};

export default action;
