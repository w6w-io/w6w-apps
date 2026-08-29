import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";

/**
 * `DELETE /folders/{folderId}` — Wrike's own description: "Move folder and
 * all descendant folders and tasks to Recycle Bin unless they have parents
 * outside of deletion scope." Not a permanent purge, and not limited to the
 * one folder — every descendant goes with it unless linked elsewhere too.
 *
 * Marked idempotent: deleting an already-deleted folder answers
 * `404 resource_not_found` rather than a second side effect.
 */
interface Input {
  folderId: string;
}

const folderDelete: ActionDefinition<Input> = {
  key: "folder-delete",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description:
    "Move a folder and its descendant folders/tasks to the Recycle Bin, unless they have parents " +
    "outside the deleted subtree.",
  idempotent: true,
  params: [{ key: "folderId", label: "Folder", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const status = await new WrikeClient(ctx, host).status(
      `/folders/${encodeURIComponent(input.folderId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default folderDelete;
