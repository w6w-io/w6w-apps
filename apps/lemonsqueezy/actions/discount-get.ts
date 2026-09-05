import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/** `GET /v1/discounts/:id`. */
interface Input {
  discountId: string;
}

const discountGet: ActionDefinition<Input> = {
  key: "discount-get",
  type: "read",
  resource: "discount",
  title: "Get Discount",
  description: "Retrieve a single discount by ID.",
  params: [{ key: "discountId", label: "Discount ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The Discount object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/discounts/${encodeURIComponent(input.discountId)}`,
    );
  },
};

export default discountGet;
