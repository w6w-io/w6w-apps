import type { ActionDefinition } from "@w6w/types";
import { drivePath, GraphClient, odataList, odataString, type PagedResult } from "../lib/client.ts";
import { driveIdParam, listOutput, pagingParams, selectParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  query: string;
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
  [k: string]: unknown;
}

/**
 * `GET /me/drive/root/search(q='{search-text}')`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-search
 *
 * Two things about this endpoint that surprise people:
 *
 *  - **It is not a filename filter.** The reference says matches "may be matched
 *    across several fields including filename, metadata, and file content", so
 *    searching `budget` returns documents that merely *mention* budget. There is
 *    no documented way to restrict it to names.
 *  - **`$filter` is not among the supported query options** ( `$expand`,
 *    `$select`, `$skipToken`, `$top` and `$orderby` are), so a result set cannot
 *    be narrowed server-side beyond the query text.
 *
 * `q` rides inside an OData function parameter, so a literal apostrophe in the
 * search term is escaped by doubling it — `odataString()` does that, and a
 * search for `Bob's plan` fails with a parse error without it.
 *
 * Least privileged delegated permission: `Files.Read`.
 */
const searchItems: ActionDefinition<Input, PagedResult<DriveItem>> = {
  key: "search-items",
  type: "search",
  resource: "item",
  title: "Search Items",
  description:
    "Search a drive for files and folders. Matches filename, metadata and file content — it is a search, not a filename filter.",
  params: [
    driveIdParam,
    {
      key: "query",
      label: "Search",
      type: "string",
      required: true,
      placeholder: "quarterly report",
      hint:
        "Text passed to `search(q='…')`. Matched across filename, metadata and file content. An apostrophe is escaped for you.",
    },
    ...selectParams(),
    ...pagingParams({
      defaultTop: 25,
      orderbyHint:
        "OData `$orderby`. Supported here, unlike `$filter`, which this endpoint does not document.",
    }),
  ],
  output: listOutput,

  execute(input, ctx): Promise<PagedResult<DriveItem>> {
    const client = new GraphClient(ctx);
    const term = (input.query ?? "").trim();
    const path = `${drivePath(input.driveId)}/root/search(q='${odataString(term)}')`;
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
    const target = input.nextLink ?? path;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect<DriveItem>(target, opts, input.maxPages ?? 10)
      : client.page<DriveItem>(target, opts);
  },
};

export default searchItems;
