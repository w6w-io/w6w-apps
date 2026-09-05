import type { ActionDefinition } from "@w6w/types";
import { type InstapaperBookmark, InstapaperClient } from "../lib/client.ts";

/** `POST /api/1/bookmarks/star` — star a bookmark. Returns the modified bookmark. */
interface Input {
  bookmarkId: number;
}

const bookmarksStar: ActionDefinition<Input> = {
  key: "bookmarks-star",
  type: "perform",
  resource: "bookmark",
  title: "Star Bookmark",
  description: "Star a bookmark.",
  idempotent: true,
  params: [{ key: "bookmarkId", label: "Bookmark ID", type: "number", required: true }],
  output: [{ key: "bookmark_id", type: "number", label: "Bookmark id" }],

  async execute(input, ctx) {
    const [bookmark] = await new InstapaperClient(ctx).call<InstapaperBookmark>(
      "/api/1/bookmarks/star",
      { bookmark_id: input.bookmarkId },
    );
    if (!bookmark) throw new Error("Instapaper returned no bookmark");
    return bookmark;
  },
};

export default bookmarksStar;
