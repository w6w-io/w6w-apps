import type { ActionDefinition } from "@w6w/types";
import { drivePath, GraphClient, odataList } from "../lib/client.ts";
import { driveIdParam } from "../lib/params.ts";

interface Input {
  driveId?: string;
  select?: string[];
}

/**
 * `GET /me/drive` — or `GET /drives/{drive-id}`.
 *
 * https://learn.microsoft.com/en-us/graph/api/drive-get
 *
 * Returns the drive resource, whose `quota` facet (`total`, `used`,
 * `remaining`, `deleted`, `state`) is the only headroom reading OneDrive
 * publishes — the `quota` health check probes exactly this call.
 *
 * Two things the reference is explicit about and that are easy to be bitten by:
 *
 *  - Requesting `/me/drive` with delegated authentication **provisions** the
 *    drive if the user is licensed but has never opened OneDrive. So this can be
 *    a write in disguise the very first time it runs for an account.
 *  - `driveType` is how you tell what you are looking at: `personal` (consumer
 *    OneDrive), `business` (OneDrive for Business) or `documentLibrary` (a
 *    SharePoint library). Several behaviours in this App differ across those —
 *    see the README.
 *
 * Least privileged delegated permission: `Files.Read`.
 */
const getDrive: ActionDefinition<Input> = {
  key: "get-drive",
  type: "read",
  resource: "drive",
  title: "Get Drive",
  description:
    "Read one drive's metadata, including its storage quota facet and its driveType (personal, business or documentLibrary).",
  params: [
    driveIdParam,
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$select`, e.g. `id`, `driveType`, `quota`, `owner`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Drive ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "driveType", type: "string", label: "Drive type" },
    { key: "quota", type: "object", label: "Storage quota" },
    { key: "owner", type: "object", label: "Owner" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(drivePath(input.driveId), {
      query: { $select: odataList(input.select) },
    });
  },
};

export default getDrive;
