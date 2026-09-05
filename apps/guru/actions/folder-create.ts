import type { ActionDefinition } from "@w6w/types";
import { compact, GuruClient, stripTokens } from "../lib/client.ts";
import { collectionIdParam } from "../lib/params.ts";

/**
 * `POST /api/v1/folders` — create a Folder ("Board" in Guru's UI). Guru's own
 * note: "Title is required".
 *
 * Requires a **User token**.
 */
interface Input {
  title: string;
  collectionId: string;
  description?: string;
  parentFolderId?: string;
}

const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: 'Create a new Folder ("Board" in Guru\'s UI) within a Collection.',
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    collectionIdParam,
    { key: "description", label: "Description", type: "text" },
    {
      key: "parentFolderId",
      label: "Parent Folder ID",
      type: "string",
      hint: "Nest inside an existing Folder. Leave empty to create at the Collection's top level.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created Folder" }],

  async execute(input, ctx) {
    const body = compact({
      title: input.title,
      collection: { id: input.collectionId },
      description: input.description,
      parentFolderId: input.parentFolderId,
    });
    const folder = await new GuruClient(ctx).json<Record<string, unknown>>("/folders", {
      method: "POST",
      body,
    });
    return stripTokens(folder);
  },
};

export default folderCreate;
