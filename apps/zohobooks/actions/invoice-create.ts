import type { ActionDefinition } from "@w6w/types";
import { booksCreate, type BooksCreateInput } from "../lib/books.ts";
import { dataFields, organizationId } from "../lib/params.ts";

const invoiceCreate: ActionDefinition<BooksCreateInput> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description: "`customer_id` and `line_items` (each needing an `item_id`) are required, e.g. " +
    '{ "customer_id": "460000000123456", "line_items": [{ "item_id": "460000000234567", ' +
    '"quantity": 2 }] }. Get customer/item ids from List Contacts / List Items.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "invoice_id", type: "string", label: "Invoice ID" }],

  execute(input, ctx) {
    return booksCreate(ctx, "/invoices", "invoice", input);
  },
};

export default invoiceCreate;
