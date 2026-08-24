import type { ActionDefinition } from "@w6w/types";
import { booksGet, type BooksGetInput } from "../lib/books.ts";
import { organizationId, recordId } from "../lib/params.ts";

const contactGet: ActionDefinition<BooksGetInput> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one Contact (customer or vendor) by id.",
  params: [{ ...recordId, hint: "The Zoho Books contact id." }, organizationId],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return booksGet(ctx, "/contacts", "contact", input);
  },
};

export default contactGet;
