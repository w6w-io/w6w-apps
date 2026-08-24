import type { ActionDefinition } from "@w6w/types";
import { booksCreate, type BooksCreateInput } from "../lib/books.ts";
import { dataFields, organizationId } from "../lib/params.ts";

const contactCreate: ActionDefinition<BooksCreateInput> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    'Create a customer or vendor. `contact_name` is required, e.g. { "contact_name": "Acme Inc", ' +
    '"contact_type": "customer", "email": "billing@acme.com" }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return booksCreate(ctx, "/contacts", "contact", input);
  },
};

export default contactCreate;
