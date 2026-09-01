import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

/** `GET /v1/orders/{id}/payments` — every payment attempt made against an order. */
interface Input {
  id: string;
}

const orderPaymentsList: ActionDefinition<Input> = {
  key: "order-payments-list",
  type: "read",
  resource: "order",
  title: "List Order's Payments",
  description: "Retrieve all payment attempts (successful and failed) made towards an order.",
  params: [orderIdParam("The order whose payment attempts to list (order_*).")],
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Payments" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(
      `/orders/${encodeURIComponent(input.id)}/payments`,
    );
  },
};

export default orderPaymentsList;
