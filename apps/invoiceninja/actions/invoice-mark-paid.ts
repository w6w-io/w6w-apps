import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

/**
 * `POST /api/v1/invoices/bulk` with `action: "mark_paid"` — verified against
 * the bulk-invoice request schema's documented enum ("Marks an array of
 * invoices as paid"). This flips the invoice's own status without recording a
 * `Payment` resource; use `payment-create` instead when the amount, date or
 * gateway reference of the payment matters to downstream reporting.
 */
const invoiceMarkPaid: ActionDefinition<Input> = {
  key: "invoice-mark-paid",
  type: "perform",
  resource: "invoice",
  title: "Mark Invoice Paid",
  description: "Mark an invoice as fully paid without recording a separate payment.",
  // Marking an already-paid invoice paid again is a no-op on Invoice Ninja's side.
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request("/invoices/bulk", {
      method: "POST",
      body: { action: "mark_paid", ids: [input.invoiceId] },
    });
    return {};
  },
};

export default invoiceMarkPaid;
