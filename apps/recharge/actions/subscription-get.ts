import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

interface Input {
  subscriptionId: string;
}

/**
 * `GET /subscriptions/{id}` — retrieve one subscription. Scope:
 * `read_subscriptions`. Response envelope: `{"subscription": {...}}`.
 */
const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Retrieve one subscription by its Recharge subscription id.",
  params: [subscriptionIdParam],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "address_id", type: "number", label: "Address ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "product_title", type: "string", label: "Product title" },
    { key: "variant_title", type: "string", label: "Variant title" },
    { key: "quantity", type: "number", label: "Quantity" },
    { key: "price", type: "string", label: "Price" },
    { key: "charge_interval_frequency", type: "number", label: "Charge interval frequency" },
    { key: "order_interval_frequency", type: "number", label: "Order interval frequency" },
    { key: "order_interval_unit", type: "string", label: "Order interval unit" },
    { key: "next_charge_scheduled_at", type: "string", label: "Next charge scheduled at" },
    { key: "is_skippable", type: "boolean", label: "Is skippable" },
    { key: "is_swappable", type: "boolean", label: "Is swappable" },
    { key: "cancelled_at", type: "string", label: "Cancelled at" },
    { key: "cancellation_reason", type: "string", label: "Cancellation reason" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
      "subscription",
    );
  },
};

export default subscriptionGet;
