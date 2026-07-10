import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, GoogleDriveClient, resolveParent } from "../lib/client.ts";

interface Input {
  fileId: string;
  name?: string;
  parentFolderId?: string;
  parentDriveId?: string;
  description?: string;
  copyRequiresWriterPermission?: boolean;
}

const copyFile: ActionDefinition<Input> = {
  key: "file-copy",
  type: "perform",
  resource: "file",
  title: "Copy File",
  description:
    "Duplicate a file. If no name is given, `Copy of <original>` is used by Google Drive.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    { key: "name", label: "New File Name", type: "string" },
    { key: "parentFolderId", label: "Parent Folder ID", type: "string" },
    { key: "parentDriveId", label: "Parent Drive ID", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "copyRequiresWriterPermission",
      label: "Copy requires writer permission",
      type: "boolean",
      default: false,
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.name) body.name = input.name;
    if (input.description) body.description = input.description;
    if (input.copyRequiresWriterPermission) {
      body.copyRequiresWriterPermission = true;
    }
    if (input.parentFolderId || input.parentDriveId) {
      body.parents = [resolveParent(input.parentFolderId, input.parentDriveId)];
    }
    return client.request(`/files/${input.fileId}/copy`, {
      method: "POST",
      body,
      query: { ...ALL_DRIVES_QS },
    });
  },
};

export default copyFile;
