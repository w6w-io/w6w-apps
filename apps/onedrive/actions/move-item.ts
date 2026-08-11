import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, ifMatchParam, itemOutput, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  targetFolderId: string;
  targetDriveId?: string;
  name?: string;
  ifMatch?: string;
}

/**
 * `PATCH /me/drive/items/{item-id}` with a new `parentReference`.
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-move
 *
 * A move is a PATCH, not a `/move` action — the same verb Rename Item uses,
 * differing only in which property it sets. The reference is emphatic about two
 * things:
 *
 *  - **You cannot move to the root by name.** "When moving items to the root of
 *    a drive, your app can't use the `id: root` syntax. Your app needs to
 *    provide the actual ID of the root folder" — fetch it with Get Item (leave
 *    both addressing fields empty) and pass the id you get back.
 *  - **Send only what changes.** "For best performance, you shouldn't include
 *    existing values that don't change", which is why the body here is built
 *    with `compact()` and carries `name` only when a rename is asked for.
 *
 * Unlike Outlook's message move, the item keeps its id: Graph returns
 * `200 OK` and the *same* driveItem under a new parent.
 *
 * Least privileged delegated permission: `Files.ReadWrite`.
 */
const moveItem: ActionDefinition<Input> = {
  key: "move-item",
  type: "perform",
  resource: "item",
  title: "Move Item",
  description:
    "Move a file or folder into another folder, optionally renaming it on the way. The item keeps its id.",
  // Describes an end state — after the first run the item is already there, and
  // a replay sets the same parent again.
  idempotent: true,
  params: [
    driveIdParam,
    ...itemParams(),
    {
      key: "targetFolderId",
      label: "Destination folder ID",
      type: "string",
      required: true,
      hint:
        "`parentReference.id` of the destination. To move to the drive root you must pass the root folder's real id — Graph rejects the literal `root` here. Get Item with no item addressed returns it.",
    },
    {
      key: "targetDriveId",
      label: "Destination drive ID",
      type: "string",
      advanced: true,
      hint: "`parentReference.driveId`. Only needed when moving into a different drive.",
    },
    {
      key: "name",
      label: "New name",
      type: "string",
      advanced: true,
      hint: "Rename while moving. Left unset, the item keeps its name.",
    },
    ifMatchParam,
  ],
  output: itemOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(requireItemPath(input), {
      method: "PATCH",
      headers: input.ifMatch ? { "if-match": input.ifMatch } : undefined,
      body: compact({
        parentReference: compact({
          id: input.targetFolderId,
          driveId: input.targetDriveId || undefined,
        }),
        name: input.name || undefined,
      }),
    });
  },
};

export default moveItem;
