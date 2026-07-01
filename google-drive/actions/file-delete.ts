import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  fileId: string;
  /** When true, the file is deleted immediately; otherwise it is trashed. */
  permanent?: boolean;
}

const deleteFile: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Move a file to the trash, or delete it permanently.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
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
      await client.request(`/files/${input.fileId}`, {
        method: "DELETE",
        query: { supportsAllDrives: true },
      });
    } else {
      await client.request(`/files/${input.fileId}`, {
        method: "PATCH",
        body: { trashed: true },
        query: { supportsAllDrives: true },
      });
    }
    return { id: input.fileId, success: true };
  },
};

export default deleteFile;
