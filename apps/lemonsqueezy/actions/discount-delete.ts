import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/** `DELETE /v1/discounts/:id` — returns `204 No Content` on success. */
interface Input {
  discountId: string;
}

const discountDelete: ActionDefinition<Input> = {
  key: "discount-delete",
  type: "perform",
  resource: "discount",
  title: "Delete Discount",
  description: "Delete a discount code.",
  idempotent: true,
  params: [{ key: "discountId", label: "Discount ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Always true — Lemon Squeezy answers 204" }],

  async execute(input, ctx) {
    await new LemonSqueezyClient(ctx).request(
      `/discounts/${encodeURIComponent(input.discountId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default discountDelete;
