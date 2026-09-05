import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, type HotmartListPage, PRODUCTS_PREFIX } from "../lib/client.ts";

/**
 * `GET /products/api/v1/coupon/product/{product_id}` — verified against
 * `developers.hotmart.com/docs/en/v1/coupon/coupon-get-coupon/` on
 * 2026-09-05.
 */
interface Input {
  productId: number;
  code?: string;
  pageToken?: string;
}

const couponList: ActionDefinition<Input> = {
  key: "coupon-list",
  type: "read",
  title: "List Coupons",
  description: "List coupons configured for a product, optionally filtered by code.",
  resource: "coupons",
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      required: true,
      hint: "7-digit product ID.",
    },
    { key: "code", label: "Coupon code", type: "string" },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "From a previous response's page_info.next_page_token or prev_page_token.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Coupons" },
    { key: "page_info", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json<HotmartListPage<unknown>>(
      `${PRODUCTS_PREFIX}/coupon/product/${encodeURIComponent(String(input.productId))}`,
      { query: { code: input.code, page_token: input.pageToken } },
    );
  },
};

export default couponList;
