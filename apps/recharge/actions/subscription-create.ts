import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";

interface Input {
  addressId: number;
  externalVariantId: string;
  quantity: number;
  orderIntervalFrequency: number;
  orderIntervalUnit: string;
  chargeIntervalFrequency: number;
  nextChargeScheduledAt: string;
  planId?: number;
  price?: string;
  productTitle?: string;
  externalProductId?: string;
}

/**
 * `POST /subscriptions` — create a subscription. Scope: `write_subscriptions`.
 *
 * `order_interval_frequency` and `charge_interval_frequency` need not match a
 * Recharge Plan's own values, but the product must have at least one Plan to
 * be addable to a subscription at all, per the reference's own note.
 * `plan_id` auto-fills the interval fields from that Plan when its own values
 * are omitted.
 *
 * Response envelope: `{"subscription": {...}}`.
 */
const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Create a new subscription for a customer's address.",
  idempotent: false,
  params: [
    { key: "addressId", label: "Address ID", type: "number", required: true },
    {
      key: "externalVariantId",
      label: "External variant ID",
      type: "string",
      required: true,
      hint: "The product variant id in the connected ecommerce platform.",
    },
    { key: "quantity", label: "Quantity", type: "number", required: true },
    {
      key: "orderIntervalFrequency",
      label: "Order interval frequency",
      type: "number",
      required: true,
      hint: "Number of units, in Order interval unit, between each order.",
    },
    {
      key: "orderIntervalUnit",
      label: "Order interval unit",
      type: "select",
      required: true,
      options: [
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ],
    },
    {
      key: "chargeIntervalFrequency",
      label: "Charge interval frequency",
      type: "number",
      required: true,
      hint: "Number of units, in Order interval unit, between each charge.",
    },
    {
      key: "nextChargeScheduledAt",
      label: "First charge date",
      type: "datetime",
      required: true,
    },
    {
      key: "planId",
      label: "Plan ID",
      type: "number",
      hint: "Auto-fills interval fields left blank from this Recharge Plan.",
    },
    { key: "price", label: "Price", type: "string" },
    { key: "productTitle", label: "Product title", type: "string" },
    { key: "externalProductId", label: "External product ID", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "next_charge_scheduled_at", type: "string", label: "Next charge scheduled at" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single("/subscriptions", "subscription", {
      method: "POST",
      body: compact({
        address_id: input.addressId,
        external_variant_id: { ecommerce: input.externalVariantId },
        quantity: input.quantity,
        order_interval_frequency: input.orderIntervalFrequency,
        order_interval_unit: input.orderIntervalUnit,
        charge_interval_frequency: input.chargeIntervalFrequency,
        next_charge_scheduled_at: input.nextChargeScheduledAt,
        plan_id: input.planId,
        price: input.price,
        product_title: input.productTitle,
        external_product_id: input.externalProductId
          ? { ecommerce: input.externalProductId }
          : undefined,
      }),
    });
  },
};

export default subscriptionCreate;
