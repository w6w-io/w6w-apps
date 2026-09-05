import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1/bookmarks/get_text` — the bookmark's processed text-view HTML.
 *
 * The one documented method with a genuinely different envelope: success is
 * `text/html` with a bare HTTP 200 ("not the standard API output
 * structures"), failure is HTTP 400 plus the standard error array. See
 * `lib/client.ts`'s `callText`.
 */
interface Input {
  bookmarkId: number;
}

const bookmarksGetText: ActionDefinition<Input> = {
  key: "bookmarks-get-text",
  type: "read",
  resource: "bookmark",
  title: "Get Bookmark Text",
  description: "Return the bookmark's processed, readable HTML.",
  params: [{ key: "bookmarkId", label: "Bookmark ID", type: "number", required: true }],
  output: [{ key: "html", type: "string", label: "Processed HTML (UTF-8)" }],

  async execute(input, ctx) {
    const html = await new InstapaperClient(ctx).callText("/api/1/bookmarks/get_text", {
      bookmark_id: input.bookmarkId,
    });
    return { html };
  },
};

export default bookmarksGetText;
