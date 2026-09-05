import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, jsonArray, unset } from "../lib/client.ts";
import { invoiceOutput } from "../lib/params.ts";

interface Input {
  invoiceId: string;
  number?: string;
  poNumber?: string;
  dueDate?: string;
  publicNotes?: string;
  privateNotes?: string;
  lineItems?: unknown;
}

/**
 * `PUT /api/v1/invoices/{id}` — verified against `updateInvoice` and
 * `InvoiceRequest`. `lineItems` is only sent (replacing the whole array) when
 * supplied — Invoice Ninja's partial-update convention leaves an omitted field
 * unchanged, and there is no per-line patch operation.
 */
const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description: "Update an invoice. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    { key: "number", label: "Invoice number", type: "string" },
    { key: "poNumber", label: "PO number", type: "string", advanced: true },
    { key: "dueDate", label: "Due date", type: "date" },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      advanced: true,
      hint: "Replaces the entire line-item array when set. Leave unset to keep the existing lines.",
    },
    { key: "publicNotes", label: "Public notes", type: "text", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: invoiceOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/invoices/${input.invoiceId}`, {
      method: "PUT",
      body: {
        number: unset(input.number),
        po_number: unset(input.poNumber),
        due_date: unset(input.dueDate),
        line_items: input.lineItems !== undefined
          ? jsonArray(input.lineItems, "lineItems")
          : undefined,
        public_notes: unset(input.publicNotes),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default invoiceUpdate;
