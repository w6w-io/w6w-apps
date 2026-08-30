import type { ActionDefinition } from "@w6w/types";
import { GraphClient, listPath, odataList } from "../lib/client.ts";
import { listIdParam, listMetaOutput, selectParams, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  listId: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /sites/{site-id}/lists/{list-id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/list-get
 *
 * Returns the list's metadata — `displayName`, `webUrl`, the `list` facet
 * (`template`, `hidden`) and, expanded, its `columns` or `items`. A list is
 * addressed by `id` only; there is no path-based form.
 *
 * Least privileged delegated permission: `Sites.Read.All`. Not supported for a
 * personal Microsoft account.
 */
const getList: ActionDefinition<Input> = {
  key: "get-list",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Get a list's metadata.",
  params: [
    ...siteParams(),
    listIdParam,
    ...selectParams("OData `$expand`, e.g. `columns`, `items`, `contentTypes`, `drive`."),
  ],
  output: listMetaOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(listPath(input), {
      query: { $select: odataList(input.select), $expand: odataList(input.expand) },
    });
  },
};

export default getList;
