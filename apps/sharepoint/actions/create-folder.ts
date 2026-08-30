import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, itemPath } from "../lib/client.ts";
import {
  conflictBehaviorParam,
  driveIdParam,
  itemOutput,
  itemParams,
  siteParams,
} from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  name: string;
  conflictBehavior?: string;
}

/**
 * `POST {drive}/items/{parent-item-id}/children`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-post-children
 *
 * A folder is created by POSTing a driveItem carrying an **empty `folder`
 * facet** — `"folder": {}`. The empty object is not a placeholder; it is how
 * the request says "this is a folder and not a file", and omitting it is the
 * classic first mistake.
 *
 * `@microsoft.graph.conflictBehavior` decides what happens when the name is
 * taken: `fail` (Graph's default), `rename` (append the lowest integer that
 * makes it unique) or `replace`. It travels in the JSON body here, exactly as
 * this endpoint's own example shows.
 *
 * Returns `201 Created` and the new driveItem.
 *
 * Least privileged delegated permission: `Files.ReadWrite`; `Sites.ReadWrite.All`
 * is documented as a valid higher alternative and is the one this App
 * requests.
 */
const createFolder: ActionDefinition<Input> = {
  key: "create-folder",
  type: "perform",
  resource: "drive-item",
  title: "Create Folder",
  description: "Create a folder inside another folder, or in the document library's root.",
  // With `fail` or `replace` a replay converges, but with `rename` — the value
  // most workflows pick — a second run mints a second folder. Graph offers no
  // dedupe key here, so idempotency cannot be claimed in general.
  idempotent: false,
  params: [
    ...siteParams(),
    driveIdParam,
    ...itemParams({ rootMeans: "the library's root folder as the parent" }),
    {
      key: "name",
      label: "Folder name",
      type: "string",
      required: true,
      placeholder: "Quarterly reports",
    },
    conflictBehaviorParam(
      "Sent as `@microsoft.graph.conflictBehavior` in the request body, as this endpoint's reference shows. `fail` is Graph's default.",
    ),
  ],
  output: itemOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(itemPath(input, "/children"), {
      method: "POST",
      body: compact({
        name: input.name,
        // The empty facet IS the type declaration.
        folder: {},
        "@microsoft.graph.conflictBehavior": input.conflictBehavior,
      }),
    });
  },
};

export default createFolder;
