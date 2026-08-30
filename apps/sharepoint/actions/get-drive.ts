import type { ActionDefinition } from "@w6w/types";
import { drivePath, GraphClient } from "../lib/client.ts";
import { driveIdParam, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  driveId?: string;
}

interface Drive {
  id?: string;
  name?: string;
  driveType?: string;
  webUrl?: string;
  quota?: unknown;
  [k: string]: unknown;
}

/**
 * `GET /sites/{site-id}/drive` — a site's **default** document library — or
 * `GET /drives/{drive-id}` to read one addressed directly.
 *
 * https://learn.microsoft.com/en-us/graph/api/drive-get
 *
 * "A Drive is the top-level container for a file system, such as OneDrive or
 * SharePoint document libraries." Returns the `quota` facet the `quota` health
 * check reads, and the drive `id` every document-library action's *Drive ID*
 * param takes to address a library other than the default one.
 *
 * Least privileged delegated permission: `Files.Read`; `Sites.Read.All` is
 * documented as a valid higher alternative and is the one this App requests.
 */
const getDrive: ActionDefinition<Input> = {
  key: "get-drive",
  type: "read",
  resource: "drive",
  title: "Get Document Library",
  description:
    "Get a site's default document library, or a specific library addressed by Drive ID.",
  params: [...siteParams(), driveIdParam],
  output: [
    { key: "id", type: "string", label: "Drive ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "driveType", type: "string", label: "Drive type" },
    { key: "webUrl", type: "string", label: "Web URL" },
    { key: "quota", type: "object", label: "Quota facet" },
  ],

  async execute(input, ctx): Promise<Drive> {
    const client = new GraphClient(ctx);
    return await client.request<Drive>(drivePath(input));
  },
};

export default getDrive;
