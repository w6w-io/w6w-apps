import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, jsonArray, unset } from "../lib/client.ts";
import { paymentOutput } from "../lib/params.ts";

interface Input {
  paymentId: string;
  amount?: number;
  date?: string;
  privateNotes?: string;
  invoices?: unknown;
}

/**
 * `POST /api/v1/payments/refund` — verified against `storeRefund`, whose
 * request body schema is (confusingly) the full `Payment` object rather than a
 * dedicated `RefundRequest`. This action exposes the payment being refunded
 * (`id`), the refund `amount`, and the same per-invoice `invoices` breakdown
 * `payment-create` uses — the fields the vendor's own `Payment` schema
 * documents as refund-relevant (`amount`, `date`, `private_notes`).
 */
const paymentRefund: ActionDefinition<Input> = {
  key: "payment-refund",
  type: "perform",
  resource: "payment",
  title: "Refund Payment",
  description: "Refund some or all of a payment.",
  idempotent: false,
  params: [
    { key: "paymentId", label: "Payment ID", type: "string", required: true },
    {
      key: "amount",
      label: "Refund amount",
      type: "number",
      hint: "Leave unset to refund the payment's full amount.",
    },
    {
      key: "invoices",
      label: "Refund invoices",
      type: "json",
      advanced: true,
      hint:
        'JSON array of { "invoice_id": "...", "amount": "..." } to break the refund down by invoice.',
    },
    { key: "date", label: "Refund date", type: "date", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: paymentOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/payments/refund", {
      method: "POST",
      body: {
        id: input.paymentId,
        amount: input.amount,
        invoices: input.invoices !== undefined ? jsonArray(input.invoices, "invoices") : undefined,
        date: unset(input.date),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default paymentRefund;
