import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  folderId: string;
}

/**
 * `DELETE /v1/folders/{folderId}` — requires `folder:write`. Returns 204 on
 * success.
 */
const deleteFolder: ActionDefinition<Input> = {
  key: "delete-folder",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Delete a folder.",
  // Deleting by ID converges on the same end state (the folder is gone) no
  // matter how many times it's called.
  idempotent: true,
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "folderId", type: "string", label: "Folder ID" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    await client.request(`/rest/v1/folders/${encodeURIComponent(input.folderId)}`, {
      method: "DELETE",
    });
    return { deleted: true, folderId: input.folderId };
  },
};

export default deleteFolder;
