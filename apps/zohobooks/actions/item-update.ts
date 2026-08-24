import type { ActionDefinition } from "@w6w/types";
import { booksUpdate, type BooksUpdateInput } from "../lib/books.ts";
import { dataFields, organizationId, recordId } from "../lib/params.ts";

const itemUpdate: ActionDefinition<BooksUpdateInput> = {
  key: "item-update",
  type: "perform",
  resource: "item",
  title: "Update Item",
  description: "Update a catalog item's fields.",
  idempotent: true,
  params: [
    { ...recordId, hint: "The Zoho Books item id." },
    { ...dataFields, hint: 'Only the fields to change, e.g. { "rate": 135 }.' },
    organizationId,
  ],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return booksUpdate(ctx, "/items", "item", input);
  },
};

export default itemUpdate;
