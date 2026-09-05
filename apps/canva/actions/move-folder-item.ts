import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  toFolderId: string;
  itemId: string;
}

/**
 * `POST /v1/folders/move` — requires `folder:write`. Returns 204 on success.
 *
 * An item that exists in multiple folders can't be moved via this API — it
 * fails with `item_in_multiple_folders` and must be moved from the Canva UI
 * instead.
 */
const moveFolderItem: ActionDefinition<Input> = {
  key: "move-folder-item",
  type: "perform",
  resource: "folder",
  title: "Move Folder Item",
  description: "Move a design, folder, image, or brand template into another folder.",
  // Moving an item that's already in the destination folder converges on
  // the same end state.
  idempotent: true,
  params: [
    {
      key: "toFolderId",
      label: "Destination folder ID",
      type: "string",
      required: true,
      hint: "Use 'root' to move to the top level of the user's projects.",
    },
    { key: "itemId", label: "Item ID to move", type: "string", required: true },
  ],
  output: [{ key: "moved", type: "boolean", label: "Moved" }],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    await client.request("/rest/v1/folders/move", {
      method: "POST",
      body: { to_folder_id: input.toFolderId, item_id: input.itemId },
    });
    return { moved: true };
  },
};

export default moveFolderItem;
