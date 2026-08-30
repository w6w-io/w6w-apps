import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, listItemPath } from "../lib/client.ts";
import { fieldsParam, ifMatchParam, listIdParam, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  listId: string;
  itemId: string;
  fields: Record<string, unknown>;
  ifMatch?: string;
}

/**
 * `PATCH /sites/{site-id}/lists/{list-id}/items/{item-id}/fields`
 *
 * https://learn.microsoft.com/en-us/graph/api/listitem-update
 *
 * The reference documents two PATCH targets — the `listItem` itself (its own
 * few writable properties) and `.../items/{item-id}/fields` (the column
 * values, via a `fieldValueSet`). This App exposes the second: "updates the
 * `Color` and `Quantity` fields ... All other values on the `listItem` are
 * left alone" — a partial update, only the keys supplied change.
 *
 * `if-match` is honoured: a mismatched eTag answers `412 Precondition Failed`
 * and the item is left untouched.
 *
 * Least privileged delegated permission: `Sites.ReadWrite.All`. Not supported
 * for a personal Microsoft account.
 */
const updateItem: ActionDefinition<Input> = {
  key: "update-item",
  type: "perform",
  resource: "list-item",
  title: "Update Item",
  description: "Update one or more column values on a SharePoint list item.",
  // A PATCH sets an end state; replaying the same fields lands on the same one.
  idempotent: true,
  params: [
    ...siteParams(),
    listIdParam,
    { key: "itemId", label: "Item ID", type: "string", required: true },
    fieldsParam(
      'Column values to change, keyed by internal column name, e.g. `{"Color":"Purple","Quantity":5}`. Columns not named here are left alone.',
    ),
    ifMatchParam,
  ],
  output: [{ key: "fields", type: "object", label: "Updated column values" }],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(listItemPath(input, "/fields"), {
      method: "PATCH",
      body: input.fields,
      headers: compact({ "if-match": input.ifMatch }) as Record<string, string>,
    });
  },
};

export default updateItem;
