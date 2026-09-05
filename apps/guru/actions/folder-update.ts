import type { ActionDefinition } from "@w6w/types";
import { compact, GuruClient, stripTokens } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";

/**
 * `PUT /api/v1/folders/{folderId}` — update a Folder's title and/or
 * description.
 *
 * Unlike `NewFolder` (the create shape), the response/update `Folder` schema
 * carries no `parentFolderId` field — Guru does not document moving a Folder
 * to a new parent through this endpoint, so this action does not expose one.
 *
 * Requires a **User token**.
 */
interface Input {
  folderId: string;
  title?: string;
  description?: string;
}

const folderUpdate: ActionDefinition<Input> = {
  key: "folder-update",
  type: "perform",
  resource: "folder",
  title: "Update Folder",
  description: "Update a Folder's title and/or description.",
  idempotent: true,
  params: [
    folderIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [{ key: "data", type: "object", label: "The updated Folder" }],

  async execute(input, ctx) {
    const body = compact({ title: input.title, description: input.description });
    const folder = await new GuruClient(ctx).json<Record<string, unknown>>(
      `/folders/${encodeURIComponent(input.folderId)}`,
      { method: "PUT", body },
    );
    return stripTokens(folder);
  },
};

export default folderUpdate;
