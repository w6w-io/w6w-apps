import type { ActionDefinition } from "@w6w/types";
import { booksStatusAction } from "../lib/books.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
  organizationId?: string;
}

const invoiceMarkSent: ActionDefinition<Input> = {
  key: "invoice-mark-sent",
  type: "perform",
  resource: "invoice",
  title: "Mark Invoice As Sent",
  description: "Mark a draft invoice as sent.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Books invoice id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return booksStatusAction(ctx, "/invoices/{id}/status/sent", input);
  },
};

export default invoiceMarkSent;
