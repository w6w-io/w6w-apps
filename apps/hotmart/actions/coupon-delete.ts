import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, PRODUCTS_PREFIX } from "../lib/client.ts";

/**
 * `DELETE /products/api/v1/coupon/{coupon_id}` — verified against
 * `developers.hotmart.com/docs/en/v1/coupon/coupon-delete-coupon/` on
 * 2026-09-05. `coupon_id` is the numeric `id` field from `coupon-list`, not
 * the human-readable coupon code. Success body is an empty object; a second
 * delete of the same id 404s, so this is not marked idempotent.
 */
interface Input {
  couponId: number;
}

const couponDelete: ActionDefinition<Input> = {
  key: "coupon-delete",
  type: "perform",
  title: "Delete Coupon",
  description: "Delete a coupon by its numeric id (from List Coupons), not its code.",
  resource: "coupons",
  idempotent: false,
  params: [
    { key: "couponId", label: "Coupon ID", type: "number", required: true },
  ],
  output: [{ key: "ok", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new HotmartClient(ctx);
    await client.json(`${PRODUCTS_PREFIX}/coupon/${encodeURIComponent(String(input.couponId))}`, {
      method: "DELETE",
    });
    return { ok: true };
  },
};

export default couponDelete;
