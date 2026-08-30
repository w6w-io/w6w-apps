import type { ActionDefinition } from "@w6w/types";
import { GraphClient, listPath } from "../lib/client.ts";
import { fieldsParam, listIdParam, listItemOutput, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  listId: string;
  fields: Record<string, unknown>;
}

/**
 * `POST /sites/{site-id}/lists/{list-id}/items`
 *
 * https://learn.microsoft.com/en-us/graph/api/listitem-create
 *
 * The reference's request body is `{ "fields": { "Title": "Widget", "Color":
 * "Purple", "Weight": 32 } }` — column values keyed by their internal name,
 * exactly what *Fields* takes here. Returns `201 Created` and the new
 * `listItem`.
 *
 * Least privileged delegated permission: `Sites.ReadWrite.All`. Not supported
 * for a personal Microsoft account.
 */
const createItem: ActionDefinition<Input> = {
  key: "create-item",
  type: "perform",
  resource: "list-item",
  title: "Create Item",
  description: "Create a new row in a SharePoint list.",
  // Every call mints a new row with a new id; Graph offers no dedupe key.
  idempotent: false,
  params: [
    ...siteParams(),
    listIdParam,
    fieldsParam(
      'Column values keyed by internal column name, e.g. `{"Title":"Widget","Color":"Purple","Weight":32}`.',
    ),
  ],
  output: listItemOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(`${listPath(input)}/items`, {
      method: "POST",
      body: { fields: input.fields },
    });
  },
};

export default createItem;
