import type { ActionDefinition } from "@w6w/types";
import { EbayClient } from "../lib/client.ts";

/**
 * Get every variation in a multi-SKU listing group (e.g. a shirt sold in
 * several sizes/colors). Wraps
 * `GET /buy/browse/v1/item/get_items_by_item_group` (Buy Browse API).
 *
 * `itemGroupId` is the `primaryItemGroup.itemGroupId` (or `itemGroupHref`'s
 * id) an `item-search`/`item-get` result carries when the listing has
 * variations.
 */
const action: ActionDefinition = {
  key: "item-group-get",
  type: "read",
  resource: "item",
  title: "Get items in a listing group",
  description: "List every variation (size, color, ...) of a multi-SKU eBay listing.",
  params: [
    {
      key: "itemGroupId",
      label: "Item Group ID",
      type: "string",
      required: true,
      default: "",
      hint: "The legacy item ID shared by every variation in the group.",
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
    { key: "items", type: "array", label: "Every variation in the group" },
    { key: "commonDescriptions", type: "array", label: "Description shared across variations" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const itemGroupId = String(p.itemGroupId ?? "").trim();
    if (!itemGroupId) throw new Error("`itemGroupId` is required");
    const marketplaceId = String(p.marketplaceId ?? "EBAY_US").trim() || "EBAY_US";
    return await new EbayClient(ctx).request("/buy/browse/v1/item/get_items_by_item_group", {
      query: { item_group_id: itemGroupId },
      headers: { "x-ebay-c-marketplace-id": marketplaceId },
    });
  },
};

export default action;
