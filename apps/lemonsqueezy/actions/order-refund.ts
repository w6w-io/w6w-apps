import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, LemonSqueezyClient } from "../lib/client.ts";

/**
 * `POST /v1/orders/:id/refund` — issue a partial or full refund.
 *
 * Omitting `amount` issues a full refund. There is no idempotency key on this
 * endpoint, so retrying a call that already succeeded either double-refunds
 * (partial) or fails against an already-refunded order (full) — never marked
 * `idempotent: true`.
 */
interface Input {
  orderId: string;
  amount?: number;
}

const orderRefund: ActionDefinition<Input> = {
  key: "order-refund",
  type: "perform",
  resource: "order",
  title: "Refund Order",
  description: "Issue a partial or full refund for an order. Omit the amount for a full refund.",
  idempotent: false,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    {
      key: "amount",
      label: "Amount (cents)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Leave blank to refund the order in full.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The Order object with updated refund fields" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/orders/${encodeURIComponent(input.orderId)}/refund`,
      {
        method: "POST",
        body: jsonApiBody("orders", { amount: input.amount }, undefined, input.orderId),
      },
    );
  },
};

export default orderRefund;
