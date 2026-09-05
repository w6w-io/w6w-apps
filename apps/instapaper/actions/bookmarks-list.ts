import type { ActionDefinition } from "@w6w/types";
import { type BookmarksListResponse, InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1/bookmarks/list` — the user's bookmarks, and (per the docs)
 * "can also synchronize reading positions".
 *
 * Answers a bespoke object (`{user, bookmarks, highlights, delete_ids}`), not
 * the standard tagged-array envelope every other method uses — see
 * `lib/client.ts`'s `callObject`.
 *
 * `have`/`highlights` (the docs' cache-sync parameters) are exposed verbatim
 * as opaque strings: building them correctly requires the caller's own local
 * `bookmark_id:hash[:progress:timestamp]` state, which this Action has no way
 * to hold between runs, so re-deriving that format here would be guessing at
 * data this app never stores.
 */
interface Input {
  limit?: number;
  folderId?: string;
  tag?: string;
  have?: string;
  highlights?: string;
}

const bookmarksList: ActionDefinition<Input> = {
  key: "bookmarks-list",
  type: "search",
  resource: "bookmark",
  title: "List Bookmarks",
  description: "List the user's bookmarks in a folder (or by tag), and sync reading positions.",
  params: [
    {
      key: "folderId",
      label: "Folder",
      type: "string",
      default: "unread",
      hint: "`unread` (default), `starred`, `archive`, or a numeric folder id from List Folders.",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: "Only used when Folder is left at its default — Instapaper does not combine a folder " +
        "and a tag filter in one call.",
    },
    { key: "limit", label: "Limit", type: "number", default: 25, hint: "1–500. Defaults to 25." },
    {
      key: "have",
      label: "Have (bookmark_id[:hash[:progress:timestamp]], comma-separated)",
      type: "string",
      advanced: true,
      hint: "Bookmarks the caller already has locally, so Instapaper can omit or diff them. See " +
        "the Instapaper API docs' 'have parameter' section for the exact format.",
    },
    {
      key: "highlights",
      label: "Highlight ids already held ('-'-delimited)",
      type: "string",
      advanced: true,
    },
  ],
  output: [
    { key: "user", type: "object", label: "The authenticated user" },
    { key: "bookmarks", type: "array", label: "Bookmarks in this page" },
    { key: "highlights", type: "array", label: "Highlights for the returned bookmarks" },
    { key: "delete_ids", type: "array", label: "Bookmark ids from `have` no longer in this list" },
  ],

  async execute(input, ctx) {
    const response = await new InstapaperClient(ctx).callObject<BookmarksListResponse>(
      "/api/1/bookmarks/list",
      {
        limit: input.limit,
        folder_id: input.folderId,
        tag: input.tag,
        have: input.have,
        highlights: input.highlights,
      },
    );
    return {
      user: response.user ?? null,
      bookmarks: response.bookmarks ?? [],
      highlights: response.highlights ?? [],
      delete_ids: response.delete_ids ?? [],
    };
  },
};

export default bookmarksList;
