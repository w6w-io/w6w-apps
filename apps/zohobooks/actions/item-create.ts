import type { ActionDefinition } from "@w6w/types";
import { booksCreate, type BooksCreateInput } from "../lib/books.ts";
import { dataFields, organizationId } from "../lib/params.ts";

const itemCreate: ActionDefinition<BooksCreateInput> = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create Item",
  description:
    '`name` and `rate` are required, e.g. { "name": "Hard Drive", "rate": 120, "description": "500GB" }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return booksCreate(ctx, "/items", "item", input);
  },
};

export default itemCreate;
