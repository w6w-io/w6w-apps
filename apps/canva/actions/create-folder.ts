import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  name: string;
  parentFolderId: string;
}

/**
 * `POST /v1/folders` — requires `folder:write`. Rate limited to 20
 * requests/minute per user.
 */
const createFolder: ActionDefinition<Input> = {
  key: "create-folder",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a new folder in the user's Projects, Uploads, or another folder.",
  // Each call creates a new folder with a new ID; a retry after a dropped
  // response would create a duplicate rather than converge.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 255 },
    },
    {
      key: "parentFolderId",
      label: "Parent folder ID",
      type: "string",
      required: true,
      hint: "Use 'root' for the top level of the user's projects, or 'uploads' for their " +
        "Uploads folder.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ folder: Record<string, unknown> }>("/rest/v1/folders", {
      method: "POST",
      body: { name: input.name, parent_folder_id: input.parentFolderId },
    });
    return res.folder;
  },
};

export default createFolder;
