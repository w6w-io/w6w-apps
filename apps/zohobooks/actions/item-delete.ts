import type { ActionDefinition } from "@w6w/types";
import { booksDelete, type BooksDeleteInput } from "../lib/books.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

const itemDelete: ActionDefinition<BooksDeleteInput> = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete Item",
  description: "Delete an existing catalog item.",
  idempotent: true,
  params: [{ ...recordId, hint: "The Zoho Books item id." }, organizationId],
  output: statusOutput,

  execute(input, ctx) {
    return booksDelete(ctx, "/items", input);
  },
};

export default itemDelete;
