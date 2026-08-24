import type { ActionDefinition } from "@w6w/types";
import { booksGet, type BooksGetInput } from "../lib/books.ts";
import { organizationId, recordId } from "../lib/params.ts";

const itemGet: ActionDefinition<BooksGetInput> = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get Item",
  description: "Retrieve one catalog item by id.",
  params: [{ ...recordId, hint: "The Zoho Books item id." }, organizationId],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return booksGet(ctx, "/items", "item", input);
  },
};

export default itemGet;
