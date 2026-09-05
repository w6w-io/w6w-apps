import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";

/**
 * `GET /api/v1/folders/{folderId}` — one Folder, including its cards and
 * sections.
 *
 * Guru's own note: pass a Collection's `homeBoardSlug` (from Get/List
 * Collections) as `folderId` to load that Collection's top-level "Home
 * Folder" structure instead of an ordinary Folder.
 */
interface Input {
  folderId: string;
  collectionId?: string;
}

const folderGet: ActionDefinition<Input> = {
  key: "folder-get",
  type: "read",
  resource: "folder",
  title: "Get Folder",
  description: "Fetch one Folder by ID, or a Collection's Home Folder via its homeBoardSlug.",
  params: [
    folderIdParam,
    {
      key: "collectionId",
      label: "Collection ID",
      type: "string",
      hint:
        "Required when folderId is a Collection's homeBoardSlug rather than an ordinary Folder ID.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The Folder" }],

  async execute(input, ctx) {
    const folder = await new GuruClient(ctx).json<Record<string, unknown>>(
      `/folders/${encodeURIComponent(input.folderId)}`,
      { query: { collection: input.collectionId } },
    );
    return stripTokens(folder);
  },
};

export default folderGet;
