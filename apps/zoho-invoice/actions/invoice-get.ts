import type { ActionDefinition } from "@w6w/types";
import { invoiceGet, type InvoiceGetInput } from "../lib/invoice.ts";
import { organizationId, recordId } from "../lib/params.ts";

const invoiceGetAction: ActionDefinition<InvoiceGetInput> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve one invoice by id.",
  params: [{ ...recordId, hint: "The Zoho Invoice invoice id." }, organizationId],
  output: [{ key: "invoice_id", type: "string", label: "Invoice ID" }],

  execute(input, ctx) {
    return invoiceGet(ctx, "/invoices", "invoice", input);
  },
};

export default invoiceGetAction;
