import type { ActionDefinition } from "@w6w/types";
import { booksDelete, type BooksDeleteInput } from "../lib/books.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const contactDelete: ActionDefinition<BooksDeleteInput> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete an existing Contact.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Books contact id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return booksDelete(ctx, "/contacts", input);
  },
};

export default contactDelete;
