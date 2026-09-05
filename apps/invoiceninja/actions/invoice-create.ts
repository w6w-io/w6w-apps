import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, jsonArray, unset } from "../lib/client.ts";
import { invoiceOutput, lineItemsParam } from "../lib/params.ts";

interface Input {
  clientId: string;
  number?: string;
  poNumber?: string;
  date?: string;
  dueDate?: string;
  discount?: number;
  isAmountDiscount?: boolean;
  publicNotes?: string;
  privateNotes?: string;
  lineItems?: unknown;
}

/**
 * `POST /api/v1/invoices` — verified against `InvoiceRequest`, whose only
 * required field is `client_id`. `line_items` (`InvoiceItem[]`) is exposed as
 * one JSON field rather than itemised controls — see `lib/params.ts`.
 */
const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description: "Create an invoice for a client.",
  // Invoice Ninja mints a new hashed id per call and has no idempotency key.
  idempotent: false,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    lineItemsParam,
    { key: "number", label: "Invoice number", type: "string", row: "meta" },
    { key: "poNumber", label: "PO number", type: "string", row: "meta" },
    { key: "date", label: "Invoice date", type: "date", row: "dates" },
    { key: "dueDate", label: "Due date", type: "date", row: "dates" },
    { key: "discount", label: "Discount", type: "number", advanced: true, row: "discount" },
    {
      key: "isAmountDiscount",
      label: "Discount is an amount (not %)",
      type: "boolean",
      advanced: true,
      row: "discount",
    },
    { key: "publicNotes", label: "Public notes", type: "text", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: invoiceOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/invoices", {
      method: "POST",
      body: {
        client_id: input.clientId,
        line_items: jsonArray(input.lineItems, "lineItems"),
        number: unset(input.number),
        po_number: unset(input.poNumber),
        date: unset(input.date),
        due_date: unset(input.dueDate),
        discount: input.discount,
        is_amount_discount: input.isAmountDiscount,
        public_notes: unset(input.publicNotes),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default invoiceCreate;
