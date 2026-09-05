import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient, type InstapaperHighlight } from "../lib/client.ts";

/**
 * `POST /api/1.1/bookmarks/<bookmark-id>/highlights` — the highlights saved
 * against one bookmark.
 *
 * Warning carried straight from the docs: HTML inside highlight text is
 * returned unescaped.
 */
interface Input {
  bookmarkId: number;
}

const highlightsList: ActionDefinition<Input> = {
  key: "highlights-list",
  type: "read",
  resource: "highlight",
  title: "List Highlights",
  description: "List the highlights saved against a bookmark. HTML in highlight text is " +
    "returned unescaped.",
  params: [{ key: "bookmarkId", label: "Bookmark ID", type: "number", required: true }],
  output: [{ key: "highlights", type: "array", label: "Highlights" }],

  async execute(input, ctx) {
    const highlights = await new InstapaperClient(ctx).call<InstapaperHighlight>(
      `/api/1.1/bookmarks/${encodeURIComponent(String(input.bookmarkId))}/highlights`,
    );
    return { highlights };
  },
};

export default highlightsList;
