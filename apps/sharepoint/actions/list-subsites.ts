import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, sitePath } from "../lib/client.ts";
import { listOutput, pagingParams, selectParams, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface Site {
  id?: string;
  displayName?: string;
  name?: string;
  webUrl?: string;
  [k: string]: unknown;
}

/**
 * `GET /sites/{site-id}/sites`
 *
 * https://learn.microsoft.com/en-us/graph/api/site-list-subsites
 *
 * "Get a collection of subsites defined for a site" — direct children only,
 * not the whole site collection tree. Recurse by calling this again with each
 * result's own `id` as the next `siteId`.
 *
 * Least privileged delegated permission: `Sites.Read.All`. Not supported for a
 * personal Microsoft account.
 */
const listSubsites: ActionDefinition<Input, PagedResult<Site>> = {
  key: "list-subsites",
  type: "read",
  resource: "site",
  title: "List Subsites",
  description: "List the direct subsites of a SharePoint site.",
  params: [
    ...siteParams(),
    ...selectParams("OData `$expand`, e.g. `drive`, `lists`."),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Site>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
    };
    const target = input.nextLink ?? `${sitePath(input)}/sites`;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<Site>(target, opts, input.maxPages ?? 10)
      : await client.page<Site>(target, opts);
  },
};

export default listSubsites;
