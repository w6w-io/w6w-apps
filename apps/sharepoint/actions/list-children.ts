import type { ActionDefinition } from "@w6w/types";
import { GraphClient, itemPath, odataList, type PagedResult } from "../lib/client.ts";
import {
  driveIdParam,
  itemParams,
  listOutput,
  pagingParams,
  selectParams,
  siteParams,
} from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  select?: string[];
  expand?: string[];
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
 * `GET {drive}/items/{item-id}/children` — or the path form, or the library
 * root.
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-list-children
 *
 * The listing everything else hangs off. Folders and files come back in the
 * same collection and are told apart by which facet is present: a folder
 * carries `folder`, a file carries `file`. There is no `type` property.
 *
 * The reference documents `$expand`, `$select`, `$skipToken`, `$top` and
 * `$orderby` for this collection — **not `$filter`**, which is why this action
 * offers none.
 *
 * Least privileged delegated permission: `Files.Read`; `Sites.Read.All` is
 * documented as a valid higher alternative and is the one this App requests.
 */
const listChildren: ActionDefinition<Input, PagedResult<DriveItem>> = {
  key: "list-children",
  type: "read",
  resource: "drive-item",
  title: "List Library Contents",
  description:
    "List the files and folders directly inside a folder, or inside the document library's root when no item is addressed.",
  params: [
    ...siteParams(),
    driveIdParam,
    ...itemParams({ rootMeans: "the library's root folder" }),
    ...selectParams("OData `$expand`, e.g. `thumbnails`."),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<DriveItem>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
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
