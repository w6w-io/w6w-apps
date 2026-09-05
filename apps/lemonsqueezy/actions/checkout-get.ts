import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/** `GET /v1/checkouts/:id`. Checkout ids are UUIDs, not integers. */
interface Input {
  checkoutId: string;
}

const checkoutGet: ActionDefinition<Input> = {
  key: "checkout-get",
  type: "read",
  resource: "checkout",
  title: "Get Checkout",
  description: "Retrieve a single checkout by ID.",
  params: [{ key: "checkoutId", label: "Checkout ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The Checkout object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/checkouts/${encodeURIComponent(input.checkoutId)}`,
    );
  },
};

export default checkoutGet;
