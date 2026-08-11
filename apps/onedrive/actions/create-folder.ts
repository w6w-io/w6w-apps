import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, itemPath } from "../lib/client.ts";
import { conflictBehaviorParam, driveIdParam, itemOutput, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  name: string;
  conflictBehavior?: string;
}

/**
 * `POST /me/drive/items/{parent-item-id}/children`
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
 * makes it unique) or `replace`. **It travels in the JSON body here**, exactly
 * as this endpoint's own example shows — even though the driveItem resource
 * page says the annotation "should be included in the URL instead of the body
 * of the request" and the copy endpoint documents it as a query parameter. The
 * pack follows each endpoint's own page; see the README.
 *
 * Returns `201 Created` and the new driveItem.
 *
 * Least privileged delegated permission: `Files.ReadWrite`.
 */
const createFolder: ActionDefinition<Input> = {
  key: "create-folder",
  type: "perform",
  resource: "item",
  title: "Create Folder",
  description: "Create a folder inside another folder, or in the drive root.",
  // With `fail` or `replace` a replay converges, but with `rename` — the value
  // most workflows pick — a second run mints a second folder. Graph offers no
  // dedupe key here, so idempotency cannot be claimed in general.
  idempotent: false,
  params: [
    driveIdParam,
    ...itemParams({ rootMeans: "the drive's root folder as the parent" }),
    {
      key: "name",
      label: "Folder name",
      type: "string",
      required: true,
      placeholder: "Quarterly reports",
    },
    conflictBehaviorParam(
      "Sent as `@microsoft.graph.conflictBehavior` in the request body, as this endpoint's reference shows. `fail` is Graph's default. Not supported on OneDrive consumer for copies, but honoured here.",
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
