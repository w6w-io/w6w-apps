import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { orderIdParam } from "../lib/params.ts";

/** `GET /v1/orders/{id}` — retrieve the full details and current status of an order. */
interface Input {
  id: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch the full details and current status of a specific order.",
  params: [orderIdParam()],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "amount", type: "number", label: "Amount (sub-unit)" },
    { key: "amount_paid", type: "number", label: "Amount paid so far" },
    { key: "amount_due", type: "number", label: "Amount still due" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "receipt", type: "string", label: "Receipt" },
    { key: "status", type: "string", label: "created | attempted | paid" },
    { key: "attempts", type: "number", label: "Payment attempts made" },
    { key: "created_at", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/orders/${encodeURIComponent(input.id)}`);
  },
};

export default orderGet;
