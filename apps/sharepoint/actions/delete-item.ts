import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, listItemPath } from "../lib/client.ts";
import { ifMatchParam, listIdParam, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  listId: string;
  itemId: string;
  ifMatch?: string;
}

/**
 * `DELETE /sites/{site-id}/lists/{list-id}/items/{item-id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/listitem-delete
 *
 * Returns `204 No Content`. `if-match` is honoured: a mismatched eTag answers
 * `412 Precondition Failed` and the item is left in place.
 *
 * Least privileged delegated permission: `Sites.ReadWrite.All`. Not supported
 * for a personal Microsoft account.
 */
const deleteItem: ActionDefinition<Input> = {
  key: "delete-item",
  type: "perform",
  resource: "list-item",
  title: "Delete Item",
  description: "Delete a row from a SharePoint list.",
  // Removing an already-removed item answers 404, but the end state — gone —
  // is the same either way; this app treats the intent as idempotent.
  idempotent: true,
  params: [
    ...siteParams(),
    listIdParam,
    { key: "itemId", label: "Item ID", type: "string", required: true },
    ifMatchParam,
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.status(listItemPath(input), {
      method: "DELETE",
      headers: compact({ "if-match": input.ifMatch }) as Record<string, string>,
    });
  },
};

export default deleteItem;
