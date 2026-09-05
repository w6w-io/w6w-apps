import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, jsonArray, unset } from "../lib/client.ts";
import { paymentOutput } from "../lib/params.ts";

interface Input {
  clientId: string;
  amount: number;
  date?: string;
  transactionReference?: string;
  privateNotes?: string;
  invoices?: unknown;
}

/**
 * `POST /api/v1/payments` — verified against `PaymentRequest`, whose own
 * description says the request "can be as simple as a client id and amount,
 * or as complex as a full payment with invoices ... that should be applied."
 * `invoices` (`InvoicePaymentable[]`, `{ invoice_id, amount }`) is exposed as
 * one JSON field to apply the payment across one or more invoices; omitted,
 * Invoice Ninja records the payment against the client without applying it to
 * a specific invoice.
 */
const paymentCreate: ActionDefinition<Input> = {
  key: "payment-create",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description: "Record a payment for a client, optionally applied to one or more invoices.",
  idempotent: false,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
    {
      key: "invoices",
      label: "Apply to invoices",
      type: "json",
      hint: 'JSON array of { "invoice_id": "...", "amount": "..." }. Leave unset to record an ' +
        "unapplied client payment.",
    },
    { key: "date", label: "Payment date", type: "date" },
    { key: "transactionReference", label: "Transaction reference", type: "string" },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: paymentOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/payments", {
      method: "POST",
      body: {
        client_id: input.clientId,
        amount: input.amount,
        invoices: input.invoices !== undefined ? jsonArray(input.invoices, "invoices") : undefined,
        date: unset(input.date),
        transaction_reference: unset(input.transactionReference),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default paymentCreate;
