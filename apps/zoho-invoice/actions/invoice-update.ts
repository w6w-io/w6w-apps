import type { ActionDefinition } from "@w6w/types";
import { invoiceUpdate, type InvoiceUpdateInput } from "../lib/invoice.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const invoiceUpdateAction: ActionDefinition<InvoiceUpdateInput> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description: "Update fields on an existing invoice.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Invoice invoice id." }, dataFields, organizationId],
  output: [{ key: "invoice_id", type: "string", label: "Invoice ID" }],

  execute(input, ctx) {
    return invoiceUpdate(ctx, "/invoices", "invoice", input);
  },
};

export default invoiceUpdateAction;
