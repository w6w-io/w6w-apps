import type { ActionDefinition } from "@w6w/types";
import { booksDelete, type BooksDeleteInput } from "../lib/books.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const invoiceDelete: ActionDefinition<BooksDeleteInput> = {
  key: "invoice-delete",
  type: "perform",
  resource: "invoice",
  title: "Delete Invoice",
  description: "Delete an existing invoice.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Books invoice id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return booksDelete(ctx, "/invoices", input);
  },
};

export default invoiceDelete;
