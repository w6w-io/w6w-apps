import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  permanent?: boolean;
}

const deleteFolder: ActionDefinition<Input> = {
  key: "folder-delete",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Move a folder to the trash, or delete it permanently.",
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
    {
      key: "permanent",
      label: "Delete permanently",
      type: "boolean",
      default: false,
      hint: "Skips the trash. Cannot be undone.",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    if (input.permanent) {
      await client.request(`/files/${input.folderId}`, {
        method: "DELETE",
        query: { supportsAllDrives: true },
      });
    } else {
      await client.request(`/files/${input.folderId}`, {
        method: "PATCH",
        body: { trashed: true },
        query: { supportsAllDrives: true },
      });
    }
    return { id: input.folderId, success: true };
  },
};

export default deleteFolder;
