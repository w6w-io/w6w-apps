import type { ActionDefinition } from "@w6w/types";
import { booksList, type BooksListInput, type BooksListResult } from "../lib/books.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends BooksListInput {
  name?: string;
}

const itemList: ActionDefinition<Input, BooksListResult<Record<string, unknown>>> = {
  key: "item-list",
  type: "read",
  resource: "item",
  title: "List Items",
  description: "List the products/services in the item catalog.",
  params: [
    organizationId,
    { key: "name", label: "Name contains", type: "string", hint: "Search items by name." },
    ...pageParams,
  ],
  output: [
    { key: "data", type: "array", label: "Items" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return booksList(ctx, "/items", "items", input, { name_contains: input.name });
  },
};

export default itemList;
