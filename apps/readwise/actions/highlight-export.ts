import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient, type ReadwiseExportPage } from "../lib/client.ts";

/**
 * `GET /api/v2/export/` — pull a user's full highlight history for backup or
 * sync, nested by book/article/podcast.
 *
 * The vendor's own recommendation: "first sync all of a user's historical
 * data by passing no parameters on the first request, then pageCursor until
 * there are no pages left. Then later, if you want to pull newly updated
 * highlights, just pass updatedAfter." This action surfaces exactly that
 * one-page-per-call shape (`nextPageCursor`) rather than looping internally,
 * so a workflow controls its own pacing across pages.
 *
 * ## Cursor paging, not offset paging
 *
 * Unlike every other list endpoint in this app, the envelope here is
 * `{count, nextPageCursor, results}` — there is no `next`/`previous` URL and
 * no `page` number, only an opaque cursor string to pass back verbatim.
 *
 * `external_id` on a result is documented as populated "only when `source` is
 * `reader`" — a reference back to the Reader product's own document id, not
 * something this app's Reader-adjacent but separate surface can otherwise
 * produce.
 */
interface Input {
  updatedAfter?: string;
  ids?: string;
  includeDeleted?: boolean;
  pageCursor?: string;
}

const highlightExport: ActionDefinition<Input> = {
  key: "highlight-export",
  type: "search",
  resource: "highlight",
  title: "Export Highlights",
  description:
    "Pull a page of the user's highlight history, nested by book. Pass pageCursor to page through.",
  params: [
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "datetime",
      hint: "ISO 8601. Fetch only highlights updated after this date — the incremental-sync path.",
    },
    {
      key: "ids",
      label: "Book IDs",
      type: "string",
      hint: "Comma-separated list of user_book_ids. Returns all highlights for these books only.",
    },
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      hint: "Return deleted highlights too, to synchronize deletions into your own store.",
    },
    {
      key: "pageCursor",
      label: "Page cursor",
      type: "string",
      hint: "The nextPageCursor from a previous call to this action. Omit on the first call.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Books, each with its nested highlights" },
    { key: "count", type: "number", label: "Total matching books" },
    { key: "nextPageCursor", type: "string", label: "Cursor for the next page, or null" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json<ReadwiseExportPage<unknown>>("/export/", {
      query: {
        updatedAfter: input.updatedAfter,
        ids: input.ids,
        includeDeleted: input.includeDeleted,
        pageCursor: input.pageCursor,
      },
    });
  },
};

export default highlightExport;
