import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

/**
 * `DELETE /api/v1/invoices/{id}` — verified against `deleteInvoice`. Soft
 * delete; re-deleting an already-deleted invoice still returns the record, so
 * retrying converges on the same end state.
 */
const invoiceDelete: ActionDefinition<Input> = {
  key: "invoice-delete",
  type: "perform",
  resource: "invoice",
  title: "Delete Invoice",
  description: "Soft-delete an invoice.",
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request(`/invoices/${input.invoiceId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default invoiceDelete;
