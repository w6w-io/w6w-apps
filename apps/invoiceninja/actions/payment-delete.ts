import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  paymentId: string;
}

/** `DELETE /api/v1/payments/{id}` — verified against `deletePayment`. Soft delete. */
const paymentDelete: ActionDefinition<Input> = {
  key: "payment-delete",
  type: "perform",
  resource: "payment",
  title: "Delete Payment",
  description: "Soft-delete a payment.",
  idempotent: true,
  params: [
    { key: "paymentId", label: "Payment ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request(`/payments/${input.paymentId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default paymentDelete;
