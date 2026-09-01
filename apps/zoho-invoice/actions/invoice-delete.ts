import type { ActionDefinition } from "@w6w/types";
import { invoiceDelete, type InvoiceDeleteInput } from "../lib/invoice.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const invoiceDeleteAction: ActionDefinition<InvoiceDeleteInput> = {
  key: "invoice-delete",
  type: "perform",
  resource: "invoice",
  title: "Delete Invoice",
  description: "Delete an invoice.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Invoice invoice id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return invoiceDelete(ctx, "/invoices", input);
  },
};

export default invoiceDeleteAction;
