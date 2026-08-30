import type { ActionDefinition } from "@w6w/types";
import { GraphClient, listItemPath, odataList } from "../lib/client.ts";
import { listIdParam, listItemOutput, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  listId: string;
  itemId: string;
  expandFields?: boolean;
  columns?: string[];
}

/**
 * `GET /sites/{site-id}/lists/{list-id}/items/{item-id}` ·
 * `?expand=fields` · `?expand=fields(select=Column1,Column2)`
 *
 * https://learn.microsoft.com/en-us/graph/api/listitem-get
 *
 * Note from the reference: with **application** permissions, a list with
 * content-approval turned on needs `Sites.Manage.All` or Graph silently omits
 * items whose approval status isn't `Approved`. This App uses delegated
 * permissions throughout, where that restriction does not apply.
 *
 * Least privileged delegated permission: `Sites.Read.All`. Not supported for a
 * personal Microsoft account.
 */
const getItem: ActionDefinition<Input> = {
  key: "get-item",
  type: "read",
  resource: "list-item",
  title: "Get Item",
  description: "Get a single row from a SharePoint list.",
  params: [
    ...siteParams(),
    listIdParam,
    { key: "itemId", label: "Item ID", type: "string", required: true },
    {
      key: "expandFields",
      label: "Expand column values",
      type: "boolean",
      default: true,
      hint: "Include the row's `fields` facet (its actual column values) via OData `$expand`.",
    },
    {
      key: "columns",
      label: "Columns",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "Internal column names to return, e.g. `Title`, `Author`. Leave empty to return every column. Only used when 'Expand column values' is on.",
    },
  ],
  output: listItemOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const columns = odataList(input.columns);
    const expand = input.expandFields === false
      ? undefined
      : columns
      ? `fields(select=${columns})`
      : "fields";
    return await client.request(listItemPath(input), { query: { $expand: expand } });
  },
};

export default getItem;
