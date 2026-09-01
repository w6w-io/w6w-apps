import type { ActionDefinition } from "@w6w/types";
import { invoiceStatusAction } from "../lib/invoice.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
  organizationId?: string;
}

const invoiceVoid: ActionDefinition<Input> = {
  key: "invoice-void",
  type: "perform",
  resource: "invoice",
  title: "Void Invoice",
  description:
    "Mark an invoice as void. Any payments/credits applied to it are unassociated and become " +
    "customer credits.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Invoice invoice id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return invoiceStatusAction(ctx, "/invoices/{id}/status/void", input);
  },
};

export default invoiceVoid;
