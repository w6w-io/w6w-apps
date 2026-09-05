import type { ActionDefinition } from "@w6w/types";
import { EbayClient } from "../lib/client.ts";

/**
 * Search current eBay listings. Wraps `GET /buy/browse/v1/item_summary/search`
 * (Buy Browse API, `buy_browse_v1_oas3.json`).
 *
 * `q` alone is enough (a bare keyword search); `category_ids`, `filter` and
 * `sort` narrow it further. Verified live: an unsigned request 403s with
 * eBay's edge block page, while a request carrying any (even invalid) bearer
 * token gets the API's own `401 {"errors":[{"domain":"OAuth", ...}]}` — this
 * app's `sign` hook always attaches a real token, so a genuine call never
 * sees the unsigned path.
 */
const action: ActionDefinition = {
  key: "item-search",
  type: "search",
  resource: "item",
  title: "Search listings",
  description: "Search current eBay listings by keyword and/or category.",
  params: [
    { key: "q", label: "Keywords", type: "string", hint: 'e.g. "iphone 13 case"' },
    {
      key: "categoryIds",
      label: "Category IDs",
      type: "string",
      hint: "Comma-separated eBay category IDs to restrict the search to.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "eBay filter syntax, e.g. price:[10..50],priceCurrency:USD",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [
        { value: "", label: "Best match (default)" },
        { value: "price", label: "Price, low to high" },
        { value: "-price", label: "Price, high to low" },
        { value: "newlyListed", label: "Newly listed" },
        { value: "endingSoonest", label: "Ending soonest" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "1–200. Default 50." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "marketplaceId",
      label: "Marketplace",
      type: "string",
      default: "EBAY_US",
      hint: "e.g. EBAY_US, EBAY_GB, EBAY_DE. Defaults to EBAY_US when omitted.",
    },
  ],
  output: [
    { key: "itemSummaries", type: "array", label: "Matching items" },
    { key: "total", type: "number", label: "Total matching items" },
    { key: "limit", type: "number", label: "Page size used" },
    { key: "offset", type: "number", label: "Page offset used" },
    { key: "next", type: "string", label: "URL of the next page, if any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const q = String(p.q ?? "").trim();
    const categoryIds = String(p.categoryIds ?? "").trim();
    if (!q && !categoryIds) {
      throw new Error("Provide `q` (keywords) and/or `categoryIds` — eBay requires one.");
    }
    const marketplaceId = String(p.marketplaceId ?? "EBAY_US").trim() || "EBAY_US";
    return await new EbayClient(ctx).request("/buy/browse/v1/item_summary/search", {
      query: {
        q: q || undefined,
        category_ids: categoryIds || undefined,
        filter: p.filter ? String(p.filter) : undefined,
        sort: p.sort ? String(p.sort) : undefined,
        limit: p.limit !== undefined ? Number(p.limit) : undefined,
        offset: p.offset !== undefined ? Number(p.offset) : undefined,
      },
      headers: { "x-ebay-c-marketplace-id": marketplaceId },
    });
  },
};

export default action;
