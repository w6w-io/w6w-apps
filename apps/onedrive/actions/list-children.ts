import type { ActionDefinition } from "@w6w/types";
import { GraphClient, itemPath, odataList, type PagedResult } from "../lib/client.ts";
import { driveIdParam, itemParams, listOutput, pagingParams, selectParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  select?: string[];
  expand?: string[];
  orderby?: string;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface DriveItem {
  id?: string;
  name?: string;
  folder?: { childCount?: number };
  file?: { mimeType?: string };
  [k: string]: unknown;
}

/**
 * `GET /me/drive/items/{item-id}/children` — or the path form, or the root.
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-list-children
 *
 * The listing everything else hangs off. Folders and files come back in the
 * same collection and are told apart by which facet is present: a folder
 * carries `folder`, a file carries `file`. There is no `type` property, and
 * relying on the filename extension instead is how "a folder called
 * `archive.zip`" becomes a bug report.
 *
 * The reference documents `$expand`, `$select`, `$skipToken`, `$top` and
 * `$orderby` for this collection — **not `$filter`**, which is why this action
 * offers none.
 *
 * Least privileged delegated permission: `Files.Read`. Costs 2 resource units
 * (a multi-item query) against the SharePoint throttling budget.
 */
const listChildren: ActionDefinition<Input, PagedResult<DriveItem>> = {
  key: "list-children",
  type: "read",
  resource: "item",
  title: "List Children",
  description:
    "List the files and folders directly inside a folder, or inside the drive root when no item is addressed.",
  params: [
    driveIdParam,
    ...itemParams({ rootMeans: "the drive's root folder" }),
    ...selectParams(),
    ...pagingParams({
      orderbyHint:
        "OData `$orderby`, e.g. `name asc`, `lastModifiedDateTime desc`, `size desc`. `$filter` is not supported on this collection.",
    }),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<DriveItem>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $orderby: input.orderby,
        $top: input.top,
      },
    };
    // A nextLink already encodes every query parameter from the original call,
    // so it is replayed verbatim rather than re-decorated.
    const target = input.nextLink ?? itemPath(input, "/children");
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<DriveItem>(target, opts, input.maxPages ?? 10)
      : await client.page<DriveItem>(target, opts);
  },
};

export default listChildren;
