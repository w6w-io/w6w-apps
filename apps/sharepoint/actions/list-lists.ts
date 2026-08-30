import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, sitePath } from "../lib/client.ts";
import { listOutput, pagingParams, selectParams, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  includeHidden?: boolean;
  select?: string[];
  expand?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface SPList {
  id?: string;
  displayName?: string;
  webUrl?: string;
  list?: { template?: string; hidden?: boolean };
  system?: unknown;
  [k: string]: unknown;
}

/**
 * `GET /sites/{site-id}/lists`
 *
 * https://learn.microsoft.com/en-us/graph/api/list-list
 *
 * "Lists with the `system` facet are hidden by default. To list them, include
 * `system` in your `$select` statement" — the reference's exact wording, which
 * is why *Include hidden lists* is offered as a checkbox rather than left to a
 * manual `$select`.
 *
 * Least privileged delegated permission: `Sites.Read.All`. Not supported for a
 * personal Microsoft account.
 */
const listLists: ActionDefinition<Input, PagedResult<SPList>> = {
  key: "list-lists",
  type: "read",
  resource: "list",
  title: "List Lists",
  description: "List the lists (including document libraries' backing lists) in a site.",
  params: [
    ...siteParams(),
    {
      key: "includeHidden",
      label: "Include hidden lists",
      type: "boolean",
      default: false,
      hint:
        "System-managed lists (document libraries' own list, site pages, etc.) carry a `system` facet and are hidden unless it's selected. This adds `system` to `$select` to surface them.",
    },
    ...selectParams("OData `$expand`, e.g. `columns`, `items`, `drive`."),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<SPList>> {
    const client = new GraphClient(ctx);
    const select = input.includeHidden ? [...(input.select ?? []), "system"] : input.select;
    const options = {
      query: { $select: odataList(select), $expand: odataList(input.expand), $top: input.top },
    };
    const target = input.nextLink ?? `${sitePath(input)}/lists`;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<SPList>(target, opts, input.maxPages ?? 10)
      : await client.page<SPList>(target, opts);
  },
};

export default listLists;
