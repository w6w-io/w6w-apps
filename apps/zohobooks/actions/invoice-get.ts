import type { ActionDefinition } from "@w6w/types";
import { booksGet, type BooksGetInput } from "../lib/books.ts";
import { organizationId, recordId } from "../lib/params.ts";

const invoiceGet: ActionDefinition<BooksGetInput> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve one invoice by id.",
  params: [{ ...recordId, hint: "The Zoho Books invoice id." }, organizationId],
  output: [{ key: "invoice_id", type: "string", label: "Invoice ID" }],

  execute(input, ctx) {
    return booksGet(ctx, "/invoices", "invoice", input);
  },
};

export default invoiceGet;
