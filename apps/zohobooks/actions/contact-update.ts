import type { ActionDefinition } from "@w6w/types";
import { booksUpdate, type BooksUpdateInput } from "../lib/books.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const contactUpdate: ActionDefinition<BooksUpdateInput> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a Contact's fields.",
  idempotent: true,
  params: [
    { ...recordId, hint: "The Zoho Books contact id." },
    { ...dataFields, hint: 'Only the fields to change, e.g. { "phone": "+1 555 0100" }.' },
    organizationId,
  ],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return booksUpdate(ctx, "/contacts", "contact", input);
  },
};

export default contactUpdate;
