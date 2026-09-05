import type { ActionDefinition } from "@w6w/types";
import { type InstapaperBookmark, InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1/bookmarks/update_read_progress` — record how far the user has
 * read one article. The docs note this same sync also happens via
 * `bookmarks/list`'s `have` parameter; this method exists for calling it on
 * its own.
 *
 * Idempotent: setting the same `(progress, progressTimestamp)` pair twice
 * leaves the bookmark in the same state both times.
 */
interface Input {
  bookmarkId: number;
  progress: number;
  progressTimestamp: number;
}

const bookmarksUpdateReadProgress: ActionDefinition<Input> = {
  key: "bookmarks-update-read-progress",
  type: "perform",
  resource: "bookmark",
  title: "Update Reading Progress",
  description: "Record the user's reading progress on a bookmark.",
  idempotent: true,
  params: [
    { key: "bookmarkId", label: "Bookmark ID", type: "number", required: true },
    {
      key: "progress",
      label: "Progress",
      type: "number",
      required: true,
      hint: "0.0–1.0 — the top edge of the reader's current viewport as a fraction of the " +
        "article's total length.",
      validation: { min: 0, max: 1 },
    },
    {
      key: "progressTimestamp",
      label: "Progress Timestamp (Unix seconds)",
      type: "number",
      required: true,
    },
  ],
  output: [{ key: "bookmark_id", type: "number", label: "Bookmark id" }],

  async execute(input, ctx) {
    const [bookmark] = await new InstapaperClient(ctx).call<InstapaperBookmark>(
      "/api/1/bookmarks/update_read_progress",
      {
        bookmark_id: input.bookmarkId,
        progress: input.progress,
        progress_timestamp: input.progressTimestamp,
      },
    );
    if (!bookmark) throw new Error("Instapaper returned no bookmark");
    return bookmark;
  },
};

export default bookmarksUpdateReadProgress;
