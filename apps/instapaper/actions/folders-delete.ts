import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1/folders/delete` — delete a folder. Its articles move to the
 * Archive, they are not deleted with it.
 */
interface Input {
  folderId: number;
}

const foldersDelete: ActionDefinition<Input> = {
  key: "folders-delete",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Delete a folder. Its bookmarks are moved to the Archive, not deleted.",
  idempotent: true,
  params: [{ key: "folderId", label: "Folder ID", type: "number", required: true }],
  output: [{ key: "folder_id", type: "number", label: "Folder id deleted" }],

  async execute(input, ctx) {
    await new InstapaperClient(ctx).call("/api/1/folders/delete", { folder_id: input.folderId });
    return { folder_id: input.folderId };
  },
};

export default foldersDelete;
