import type { ActionDefinition } from "@w6w/types";
import { type InstapaperBookmark, InstapaperClient } from "../lib/client.ts";

/** `POST /api/1/bookmarks/unstar` — un-star a bookmark. Returns the modified bookmark. */
interface Input {
  bookmarkId: number;
}

const bookmarksUnstar: ActionDefinition<Input> = {
  key: "bookmarks-unstar",
  type: "perform",
  resource: "bookmark",
  title: "Unstar Bookmark",
  description: "Remove the star from a bookmark.",
  idempotent: true,
  params: [{ key: "bookmarkId", label: "Bookmark ID", type: "number", required: true }],
  output: [{ key: "bookmark_id", type: "number", label: "Bookmark id" }],

  async execute(input, ctx) {
    const [bookmark] = await new InstapaperClient(ctx).call<InstapaperBookmark>(
      "/api/1/bookmarks/unstar",
      { bookmark_id: input.bookmarkId },
    );
    if (!bookmark) throw new Error("Instapaper returned no bookmark");
    return bookmark;
  },
};

export default bookmarksUnstar;
