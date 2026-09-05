import type { ActionDefinition } from "@w6w/types";
import { compact, HotmartClient, PRODUCTS_PREFIX, toList } from "../lib/client.ts";

/**
 * `POST /products/api/v1/product/{product_id}/coupon` — verified against
 * `developers.hotmart.com/docs/en/v1/coupon/coupon-post-coupon/` on
 * 2026-09-05.
 *
 * **Not supported for subscription products** — the doc says to check the
 * `is_subscription` field from `product-list` first; Hotmart's own error for
 * the unsupported case is a generic `internal_error`, so this app cannot
 * pre-validate it and surfaces that message verbatim instead of guessing.
 * `discount` is a fraction strictly between 0 and 0.99 (10% off is `0.1`, not
 * `10`). The success body is an empty object.
 */
interface Input {
  productId: number;
  code: string;
  discount: number;
  startDate?: number;
  endDate?: number;
  affiliate?: number;
  offerIds?: string[];
}

const couponCreate: ActionDefinition<Input> = {
  key: "coupon-create",
  type: "perform",
  title: "Create Coupon",
  description:
    "Create a percentage-off coupon for a (non-subscription) product. Discount is a fraction " +
    "greater than 0 and less than 0.99.",
  resource: "coupons",
  idempotent: false,
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      required: true,
      hint: "7-digit product ID.",
    },
    {
      key: "code",
      label: "Coupon code",
      type: "string",
      required: true,
      validation: { maxLength: 25 },
    },
    {
      key: "discount",
      label: "Discount",
      type: "number",
      required: true,
      validation: { min: 0, max: 0.99 },
      hint:
        "Fraction of the price, e.g. 0.1 for 10% off. Must be greater than 0 and less than 0.99.",
    },
    {
      key: "startDate",
      label: "Start date (ms epoch)",
      type: "number",
      hint: "In the seller's own account time zone. Defaults to immediately active.",
    },
    { key: "endDate", label: "End date (ms epoch)", type: "number" },
    {
      key: "affiliate",
      label: "Affiliate ID",
      type: "number",
      hint: "Restrict the coupon to one affiliate.",
    },
    {
      key: "offerIds",
      label: "Offer codes",
      type: "string",
      repeat: true,
      hint: "Restrict the coupon to specific offer codes. Leave empty to apply to every offer.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Created" }],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    await client.json(
      `${PRODUCTS_PREFIX}/product/${encodeURIComponent(String(input.productId))}/coupon`,
      {
        method: "POST",
        body: compact({
          code: input.code,
          discount: input.discount,
          start_date: input.startDate,
          end_date: input.endDate,
          affiliate: input.affiliate,
          offer_ids: toList(input.offerIds),
        }),
      },
    );
    return { ok: true };
  },
};

export default couponCreate;
