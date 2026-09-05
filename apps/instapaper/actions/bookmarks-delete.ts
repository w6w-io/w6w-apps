import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1/bookmarks/delete` — **permanently** deletes the bookmark.
 *
 * The docs are explicit this is NOT the same as Archive, and ask integrators
 * to be clear with users about the distinction — see `bookmarks-archive.ts`
 * for the reversible alternative.
 *
 * Output on success is an empty array; idempotent because the end state
 * (bookmark gone) is identical whether this is the first call or the fifth.
 */
interface Input {
  bookmarkId: number;
}

const bookmarksDelete: ActionDefinition<Input> = {
  key: "bookmarks-delete",
  type: "perform",
  resource: "bookmark",
  title: "Delete Bookmark",
  description: "Permanently delete a bookmark. This is NOT the same as archiving it.",
  idempotent: true,
  params: [{ key: "bookmarkId", label: "Bookmark ID", type: "number", required: true }],
  output: [{ key: "bookmark_id", type: "number", label: "Bookmark id deleted" }],

  async execute(input, ctx) {
    await new InstapaperClient(ctx).call("/api/1/bookmarks/delete", {
      bookmark_id: input.bookmarkId,
    });
    return { bookmark_id: input.bookmarkId };
  },
};

export default bookmarksDelete;
