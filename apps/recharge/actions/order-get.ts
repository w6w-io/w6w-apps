import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";

interface Input {
  orderId: string;
}

/**
 * `GET /orders/{id}` — retrieve one order. Scope: `read_orders`.
 * Response envelope: `{"order": {...}}`.
 */
const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Retrieve one order by its Recharge order id.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "address_id", type: "number", label: "Address ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "total_price", type: "string", label: "Total price" },
    { key: "processed_at", type: "string", label: "Processed at" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "line_items", type: "array", label: "Line items" },
    { key: "charge", type: "object", label: "Associated charge" },
    { key: "is_prepaid", type: "boolean", label: "Generated from a prepaid subscription" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(`/orders/${encodeURIComponent(input.orderId)}`, "order");
  },
};

export default orderGet;
