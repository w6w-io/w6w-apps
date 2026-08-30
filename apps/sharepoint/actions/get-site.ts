import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, sitePath } from "../lib/client.ts";
import { selectParams, siteOutput, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /sites/root` · `GET /sites/{site-id}` · `GET /sites/{hostname}` ·
 * `GET /sites/{hostname}:/{server-relative-path}`
 *
 * https://learn.microsoft.com/en-us/graph/api/site-get
 * https://learn.microsoft.com/en-us/graph/api/site-getbypath
 *
 * A `site` resource is read-only through this API — the reference states
 * plainly that the SharePoint API has "Read-only support for site resources
 * (no ability to create new sites)" — so this App offers no create/update/
 * delete for it. See `lib/client.ts#sitePath()` for the addressing rules.
 *
 * Least privileged delegated permission: `Sites.Read.All`. Not supported for a
 * personal Microsoft account.
 */
const getSite: ActionDefinition<Input> = {
  key: "get-site",
  type: "read",
  resource: "site",
  title: "Get Site",
  description:
    "Get a SharePoint site — the tenant's default root site, a specific site by ID, or a site by its hostname and server-relative path.",
  params: [
    ...siteParams(),
    ...selectParams(
      "OData `$expand`, e.g. `drive`, `lists`, `sites`. Note `sites` only returns direct subsites — see List Subsites for a dedicated call.",
    ),
  ],
  output: siteOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(sitePath(input), {
      query: { $select: odataList(input.select), $expand: odataList(input.expand) },
    });
  },
};

export default getSite;
