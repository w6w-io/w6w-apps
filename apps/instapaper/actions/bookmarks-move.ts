import type { ActionDefinition } from "@w6w/types";
import { type InstapaperBookmark, InstapaperClient } from "../lib/client.ts";

/** `POST /api/1/bookmarks/move` — move a bookmark into a user-created folder. */
interface Input {
  bookmarkId: number;
  folderId: number;
}

const bookmarksMove: ActionDefinition<Input> = {
  key: "bookmarks-move",
  type: "perform",
  resource: "bookmark",
  title: "Move Bookmark",
  description: "Move a bookmark into a user-created folder.",
  idempotent: true,
  params: [
    { key: "bookmarkId", label: "Bookmark ID", type: "number", required: true },
    {
      key: "folderId",
      label: "Folder ID",
      type: "number",
      required: true,
      hint: "From List Folders.",
    },
  ],
  output: [{ key: "bookmark_id", type: "number", label: "Bookmark id" }],

  async execute(input, ctx) {
    const [bookmark] = await new InstapaperClient(ctx).call<InstapaperBookmark>(
      "/api/1/bookmarks/move",
      { bookmark_id: input.bookmarkId, folder_id: input.folderId },
    );
    if (!bookmark) throw new Error("Instapaper returned no bookmark");
    return bookmark;
  },
};

export default bookmarksMove;
