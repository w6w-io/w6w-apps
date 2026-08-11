import type { ActionDefinition } from "@w6w/types";
import { GraphClient, itemPath, odataList } from "../lib/client.ts";
import { driveIdParam, itemOutput, itemParams, selectParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /me/drive/items/{item-id}` — or `GET /me/drive/root:/{item-path}`.
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-get
 *
 * The bridge between the two addressing forms: give it a path, get back the id
 * every other action can use afterwards even if the file later moves.
 *
 * The reference documents `$select` and `$expand` here and nothing else.
 * `$expand=children` folds a folder's listing into the same call, which is
 * cheaper than a second request when the folder is small.
 *
 * Least privileged delegated permission: `Files.Read`.
 */
const getItem: ActionDefinition<Input> = {
  key: "get-item",
  type: "read",
  resource: "item",
  title: "Get Item",
  description:
    "Read one file or folder's metadata. Addressed by id or by path — the usual way to turn a path into a stable item id.",
  params: [
    driveIdParam,
    ...itemParams({ rootMeans: "the drive's root folder itself" }),
    ...selectParams(),
  ],
  output: itemOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(itemPath(input), {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
      },
    });
  },
};

export default getItem;
