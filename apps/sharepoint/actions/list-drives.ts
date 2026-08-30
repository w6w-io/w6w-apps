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

interface Drive {
  id?: string;
  name?: string;
  driveType?: string;
  webUrl?: string;
  [k: string]: unknown;
}

/**
 * `GET /sites/{site-id}/drives`
 *
 * https://learn.microsoft.com/en-us/graph/api/drive-list
 *
 * "To list the document libraries for a site, your app requests the `drives`
 * relationship on the Site." Every document-library action's advanced *Drive
 * ID* param takes one of the `id` values this returns.
 *
 * Least privileged delegated permission: `Files.Read`; `Sites.Read.All` is
 * documented as a valid higher alternative and is the one this App requests.
 */
const listDrives: ActionDefinition<Input, PagedResult<Drive>> = {
  key: "list-drives",
  type: "read",
  resource: "drive",
  title: "List Document Libraries",
  description: "List the document libraries (drives) belonging to a SharePoint site.",
  params: [
    ...siteParams(),
    ...selectParams("OData `$expand`, e.g. `quota`."),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Drive>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
    };
    const target = input.nextLink ?? `${sitePath(input)}/drives`;
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<Drive>(target, opts, input.maxPages ?? 10)
      : await client.page<Drive>(target, opts);
  },
};

export default listDrives;
