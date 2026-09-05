import type { ActionDefinition } from "@w6w/types";
import { EbayClient } from "../lib/client.ts";

/**
 * Get a single item by its RESTful item ID. Wraps
 * `GET /buy/browse/v1/item/{item_id}` (Buy Browse API).
 *
 * `item_id` is the `v1|<legacyItemId>|<legacyVariationId or 0>` form
 * returned as `itemId` by `item-search` — a different, opaque identifier
 * from eBay's older numeric "legacy" item ID (see `item-get-by-legacy-id`).
 */
const action: ActionDefinition = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get an item",
  description: "Show full details for one item, by its eBay RESTful item ID.",
  params: [
    {
      key: "itemId",
      label: "Item ID",
      type: "string",
      required: true,
      default: "",
      hint: "e.g. v1|123456789012|0 — the `itemId` field from Search listings.",
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
    { key: "itemId", type: "string", label: "Item ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "price", type: "object", label: "Current price" },
    { key: "condition", type: "string", label: "Condition" },
    { key: "seller", type: "object", label: "Seller summary" },
    { key: "itemWebUrl", type: "string", label: "eBay listing URL" },
    { key: "shippingOptions", type: "array", label: "Shipping options" },
    { key: "estimatedAvailabilities", type: "array", label: "Quantity available" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const itemId = String(p.itemId ?? "").trim();
    if (!itemId) throw new Error("`itemId` is required");
    const marketplaceId = String(p.marketplaceId ?? "EBAY_US").trim() || "EBAY_US";
    return await new EbayClient(ctx).request(`/buy/browse/v1/item/${encodeURIComponent(itemId)}`, {
      headers: { "x-ebay-c-marketplace-id": marketplaceId },
    });
  },
};

export default action;
