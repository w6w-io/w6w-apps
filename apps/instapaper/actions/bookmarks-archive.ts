import type { ActionDefinition } from "@w6w/types";
import { type InstapaperBookmark, InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1/bookmarks/archive` — move a bookmark to the Archive. Unlike
 * Delete (`bookmarks-delete.ts`), this is reversible via Unarchive.
 */
interface Input {
  bookmarkId: number;
}

const bookmarksArchive: ActionDefinition<Input> = {
  key: "bookmarks-archive",
  type: "perform",
  resource: "bookmark",
  title: "Archive Bookmark",
  description: "Move a bookmark to the Archive.",
  idempotent: true,
  params: [{ key: "bookmarkId", label: "Bookmark ID", type: "number", required: true }],
  output: [{ key: "bookmark_id", type: "number", label: "Bookmark id" }],

  async execute(input, ctx) {
    const [bookmark] = await new InstapaperClient(ctx).call<InstapaperBookmark>(
      "/api/1/bookmarks/archive",
      { bookmark_id: input.bookmarkId },
    );
    if (!bookmark) throw new Error("Instapaper returned no bookmark");
    return bookmark;
  },
};

export default bookmarksArchive;
