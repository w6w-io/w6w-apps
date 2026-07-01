import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, FOLDER_MIME, GoogleDriveClient, resolveParent } from "../lib/client.ts";

interface Input {
  name: string;
  parentFolderId?: string;
  parentDriveId?: string;
  folderColorRgb?: string;
}

const createFolder: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a new folder under the given parent (defaults to My Drive root).",
  params: [
    { key: "name", label: "Folder Name", type: "string", required: true },
    { key: "parentFolderId", label: "Parent Folder ID", type: "string" },
    { key: "parentDriveId", label: "Parent Drive ID", type: "string" },
    { key: "folderColorRgb", label: "Folder color (hex)", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const body: Record<string, unknown> = {
      name: input.name,
      mimeType: FOLDER_MIME,
      parents: [resolveParent(input.parentFolderId, input.parentDriveId)],
    };
    if (input.folderColorRgb) body.folderColorRgb = input.folderColorRgb;
    return client.request("/files", {
      method: "POST",
      body,
      query: { fields: "*", ...ALL_DRIVES_QS },
    });
  },
};

export default createFolder;
