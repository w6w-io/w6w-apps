import type { ActionDefinition } from "@w6w/types";
import { booksUpdate, type BooksUpdateInput } from "../lib/books.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const invoiceUpdate: ActionDefinition<BooksUpdateInput> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description: "Update an invoice's fields. To remove a line item, submit `line_items` without it.",
  idempotent: true,
  params: [
    { ...recordId, hint: "The Zoho Books invoice id." },
    { ...dataFields, hint: 'Only the fields to change, e.g. { "reference_number": "PO-42" }.' },
    organizationId,
  ],
  output: [{ key: "invoice_id", type: "string", label: "Invoice ID" }],

  execute(input, ctx) {
    return booksUpdate(ctx, "/invoices", "invoice", input);
  },
};

export default invoiceUpdate;
