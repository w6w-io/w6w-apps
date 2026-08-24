import type { ActionDefinition } from "@w6w/types";
import { booksList, type BooksListInput, type BooksListResult } from "../lib/books.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends BooksListInput {
  contactType?: "customer" | "vendor";
  searchText?: string;
}

const contactList: ActionDefinition<Input, BooksListResult<Record<string, unknown>>> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List customers and vendors, with optional type/text filters.",
  params: [
    organizationId,
    {
      key: "contactType",
      label: "Contact type",
      type: "select",
      options: [
        { value: "customer", label: "Customer" },
        { value: "vendor", label: "Vendor" },
      ],
      hint: "Leave unset to list both customers and vendors.",
    },
    {
      key: "searchText",
      label: "Search text",
      type: "string",
      hint: "Matches contact name or notes.",
    },
    ...pageParams,
  ],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return booksList(ctx, "/contacts", "contacts", input, {
      contact_type: input.contactType,
      search_text: input.searchText,
    });
  },
};

export default contactList;
