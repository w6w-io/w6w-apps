import type { ActionDefinition } from "@w6w/types";
import { invoiceCreate, type InvoiceCreateInput } from "../lib/invoice.ts";
import { dataFields, organizationId } from "../lib/params.ts";

const invoiceCreateAction: ActionDefinition<InvoiceCreateInput> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    '`customer_id` is required, e.g. { "customer_id": "460000000123456", "line_items": ' +
    '[{ "item_id": "460000000234567", "quantity": 1 }] }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "invoice_id", type: "string", label: "Invoice ID" }],

  execute(input, ctx) {
    return invoiceCreate(ctx, "/invoices", "invoice", input);
  },
};

export default invoiceCreateAction;
