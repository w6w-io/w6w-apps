import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

/** `GET /v1/orders/:id`. */
interface Input {
  orderId: string;
  include?: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve a single order by ID.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    includeParam,
  ],
  output: [{ key: "data", type: "object", label: "The Order object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(`/orders/${encodeURIComponent(input.orderId)}`, {
      query: { include: input.include },
    });
  },
};

export default orderGet;
