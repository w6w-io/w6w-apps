import type { ActionDefinition } from "@w6w/types";
import { GraphClient, listPath, odataList, type PagedResult } from "../lib/client.ts";
import { listIdParam, listItemOutput, pagingParams, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  listId: string;
  expandFields?: boolean;
  columns?: string[];
  filter?: string;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface ListItem {
  id?: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  fields?: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * `GET /sites/{site-id}/lists/{list-id}/items` ·
 * `?expand=fields` · `?expand=fields(select=Column1,Column2)`
 *
 * https://learn.microsoft.com/en-us/graph/api/listitem-list
 *
 * Column values live under the `fields` facet and are not returned unless
 * expanded — the reference's own three example URLs are exactly the three
 * modes *Expand column values* / *Columns* below select between.
 *
 * `$filter` supports `eq`, `ne`, `lt`, `gt`, `le`, `ge` and `startswith`, on
 * both `listItem` properties and fields, and "works best on indexed columns" —
 * an un-indexed filter can still page rather than returning everything at
 * once.
 *
 * Least privileged delegated permission: `Sites.Read.All`. Not supported for a
 * personal Microsoft account.
 */
const listItems: ActionDefinition<Input, PagedResult<ListItem>> = {
  key: "list-items",
  type: "read",
  resource: "list-item",
  title: "List Items",
  description: "List the rows in a SharePoint list.",
  params: [
    ...siteParams(),
    listIdParam,
    {
      key: "expandFields",
      label: "Expand column values",
      type: "boolean",
      default: true,
      hint: "Include each row's `fields` facet (its actual column values) via OData `$expand`.",
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
    {
      key: "filter",
      label: "Filter",
      type: "string",
      advanced: true,
      placeholder: "fields/Color eq 'Purple'",
      hint:
        "OData `$filter` — `eq`, `ne`, `lt`, `gt`, `le`, `ge`, `startswith`, on listItem properties or `fields/{ColumnName}`. Works best on indexed columns.",
    },
    ...pagingParams(),
  ],
  output: listItemOutput,

  async execute(input, ctx): Promise<PagedResult<ListItem>> {
    const client = new GraphClient(ctx);
    const columns = odataList(input.columns);
    const expand = input.expandFields === false
      ? undefined
      : columns
      ? `fields(select=${columns})`
      : "fields";
    const options = { query: { $expand: expand, $filter: input.filter, $top: input.top } };
    const target = input.nextLink ?? `${listPath(input)}/items`;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<ListItem>(target, opts, input.maxPages ?? 10)
      : await client.page<ListItem>(target, opts);
  },
};

export default listItems;
