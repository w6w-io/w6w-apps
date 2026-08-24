import type { ActionDefinition } from "@w6w/types";
import { booksStatusAction } from "../lib/books.ts";
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
  params: [{ ...recordId, hint: "The Zoho Books invoice id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return booksStatusAction(ctx, "/invoices/{id}/status/void", input);
  },
};

export default invoiceVoid;
