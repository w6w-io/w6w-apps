import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  name: string;
}

/**
 * `PATCH /v1/folders/{folderId}` — requires `folder:write`. Currently the
 * only mutable field is the folder's name.
 */
const updateFolder: ActionDefinition<Input> = {
  key: "update-folder",
  type: "perform",
  resource: "folder",
  title: "Update Folder",
  description: "Rename a folder.",
  // A PATCH that sets the same name converges on the same state; retrying
  // is safe.
  idempotent: true,
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
    {
      key: "name",
      label: "New name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 255 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ folder: Record<string, unknown> }>(
      `/rest/v1/folders/${encodeURIComponent(input.folderId)}`,
      { method: "PATCH", body: { name: input.name } },
    );
    return res.folder;
  },
};

export default updateFolder;
