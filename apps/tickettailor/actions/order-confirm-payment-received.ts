import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/orders/{order_id}/confirm-payment-received` — verified against
 * `confirmPaymentRecieved`, 2026-09-05 (the vendor's own `operationId`
 * misspells "received"; the path does not).  For orders placed with an
 * offline payment method, marks the payment as received.
 */
interface Input {
  orderId: string;
  transactionId?: string;
}

const orderConfirmPaymentReceived: ActionDefinition<Input> = {
  key: "order-confirm-payment-received",
  type: "perform",
  resource: "order",
  title: "Confirm Order Payment Received",
  description: "Mark an offline-payment order's payment as received.",
  idempotent: true,
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true, placeholder: "or_123" },
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      hint: "Optional reference for the offline payment.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "object", type: "string", label: "Object type" },
    { key: "payment_received", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/orders/${encodeURIComponent(input.orderId)}/confirm-payment-received`,
      { method: "POST", form: { transaction_id: input.transactionId } },
    );
  },
};

export default orderConfirmPaymentReceived;
