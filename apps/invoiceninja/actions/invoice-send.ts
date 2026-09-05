import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

/**
 * `POST /api/v1/invoices/bulk` with `action: "email"` — verified against the
 * bulk-invoice request schema's own documented enum, which lists `email`
 * ("Emails an array of invoices") alongside `mark_sent`, `mark_paid`,
 * `archive`, `restore`, `delete` and `cancel`. There is no single-invoice
 * `/invoices/{id}/send` route in this API; bulk with a one-element `ids` array
 * is the documented way to email one invoice. Not marked idempotent — Invoice
 * Ninja gives no signal that repeating the call suppresses a duplicate send.
 */
const invoiceSend: ActionDefinition<Input> = {
  key: "invoice-send",
  type: "perform",
  resource: "invoice",
  title: "Send Invoice",
  description: "Email an invoice to its client.",
  idempotent: false,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request("/invoices/bulk", {
      method: "POST",
      body: { action: "email", ids: [input.invoiceId] },
    });
    return {};
  },
};

export default invoiceSend;
