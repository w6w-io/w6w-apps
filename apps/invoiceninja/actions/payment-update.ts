import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { paymentOutput } from "../lib/params.ts";

interface Input {
  paymentId: string;
  date?: string;
  transactionReference?: string;
  privateNotes?: string;
}

/**
 * `PUT /api/v1/payments/{id}` — verified against `updatePayment` and
 * `PaymentRequest`. The amount and applied invoices are set at creation;
 * this exposes the fields Invoice Ninja documents as safely revisable after
 * the fact.
 */
const paymentUpdate: ActionDefinition<Input> = {
  key: "payment-update",
  type: "perform",
  resource: "payment",
  title: "Update Payment",
  description: "Update a payment's date, reference or notes.",
  idempotent: true,
  params: [
    { key: "paymentId", label: "Payment ID", type: "string", required: true },
    { key: "date", label: "Payment date", type: "date" },
    { key: "transactionReference", label: "Transaction reference", type: "string" },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: paymentOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/payments/${input.paymentId}`, {
      method: "PUT",
      body: {
        date: unset(input.date),
        transaction_reference: unset(input.transactionReference),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default paymentUpdate;
