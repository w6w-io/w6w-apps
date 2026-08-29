import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient, type ReadwisePage } from "../lib/client.ts";
import { pageParams, updatedFilterParams } from "../lib/params.ts";

/**
 * `GET /api/v2/highlights/` — the "Advanced API" query-and-filter surface.
 *
 * The vendor's own note steers most integrations away from this endpoint
 * toward Highlight EXPORT instead ("should be sufficient for almost all
 * usecases that either want to create or export"), reserving this one for
 * "more complex integrations that might want to carefully read, query,
 * update, or delete a user's highlights" — which is exactly the shape a
 * workflow step needing `book_id` or a date-range filter wants. See
 * `highlight-export.ts` for the bulk-sync path.
 *
 * **Rate limit:** this endpoint is restricted to 20 requests/minute per
 * token, a fifth of the 240/minute default — call it in a loop with care.
 */
interface Input {
  bookId?: string;
  updated__gt?: string;
  updated__lt?: string;
  highlighted_at__gt?: string;
  highlighted_at__lt?: string;
  page_size?: number;
  page?: number;
}

const highlightList: ActionDefinition<Input> = {
  key: "highlight-list",
  type: "search",
  resource: "highlight",
  title: "List Highlights",
  description: "Query highlights, optionally filtered to one book or a date range.",
  params: [
    {
      key: "bookId",
      label: "Book ID",
      type: "string",
      hint: "Return highlights for this book/article/podcast only.",
    },
    ...updatedFilterParams(),
    {
      key: "highlighted_at__gt",
      label: "Highlighted after",
      type: "datetime",
      hint: "Filter by when the highlight was taken. Some highlights have no value set.",
    },
    {
      key: "highlighted_at__lt",
      label: "Highlighted before",
      type: "datetime",
      hint: "Filter by when the highlight was taken. Some highlights have no value set.",
    },
    ...pageParams(),
  ],
  output: [
    { key: "results", type: "array", label: "Highlights" },
    { key: "count", type: "number", label: "Total matching highlights" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json<ReadwisePage<unknown>>("/highlights/", {
      query: {
        book_id: input.bookId,
        updated__gt: input.updated__gt,
        updated__lt: input.updated__lt,
        highlighted_at__gt: input.highlighted_at__gt,
        highlighted_at__lt: input.highlighted_at__lt,
        page_size: input.page_size,
        page: input.page,
      },
    });
  },
};

export default highlightList;
