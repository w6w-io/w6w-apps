import type { ActionDefinition } from "@w6w/types";
import { type InstapaperBookmark, InstapaperClient } from "../lib/client.ts";

/** `POST /api/1/bookmarks/unarchive` — move a bookmark to the top of the Unread folder. */
interface Input {
  bookmarkId: number;
}

const bookmarksUnarchive: ActionDefinition<Input> = {
  key: "bookmarks-unarchive",
  type: "perform",
  resource: "bookmark",
  title: "Unarchive Bookmark",
  description: "Move a bookmark from the Archive to the top of the Unread folder.",
  idempotent: true,
  params: [{ key: "bookmarkId", label: "Bookmark ID", type: "number", required: true }],
  output: [{ key: "bookmark_id", type: "number", label: "Bookmark id" }],

  async execute(input, ctx) {
    const [bookmark] = await new InstapaperClient(ctx).call<InstapaperBookmark>(
      "/api/1/bookmarks/unarchive",
      { bookmark_id: input.bookmarkId },
    );
    if (!bookmark) throw new Error("Instapaper returned no bookmark");
    return bookmark;
  },
};

export default bookmarksUnarchive;
