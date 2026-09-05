import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  folderId: string;
}

/**
 * `GET /v1/folders/{folderId}` — requires `folder:read`.
 */
const getFolder: ActionDefinition<Input> = {
  key: "get-folder",
  type: "read",
  resource: "folder",
  title: "Get Folder",
  description: "Get a folder's metadata (name, timestamps, thumbnail).",
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "thumbnail", type: "object", label: "Thumbnail" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ folder: Record<string, unknown> }>(
      `/rest/v1/folders/${encodeURIComponent(input.folderId)}`,
    );
    return res.folder;
  },
};

export default getFolder;
