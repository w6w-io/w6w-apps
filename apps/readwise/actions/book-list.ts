import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient, type ReadwisePage } from "../lib/client.ts";
import { bookCategoryOptions, pageParams, updatedFilterParams } from "../lib/params.ts";

/**
 * `GET /api/v2/books/` — the account's books/articles/tweets/podcasts.
 *
 * `category` accepts `supplementals` here, a value Highlight CREATE's own
 * `category` field does not document — the two are kept as separate option
 * lists ({@link bookCategoryOptions} vs `highlightCategoryOptions`) rather
 * than shared, since sending `supplementals` back to CREATE is unverified.
 */
interface Input {
  category?: string;
  source?: string;
  updated__gt?: string;
  updated__lt?: string;
  last_highlight_at__gt?: string;
  last_highlight_at__lt?: string;
  page_size?: number;
  page?: number;
}

const bookList: ActionDefinition<Input> = {
  key: "book-list",
  type: "search",
  resource: "book",
  title: "List Books",
  description: "List the account's books, articles, tweets and podcasts.",
  params: [
    { key: "category", label: "Category", type: "select", options: bookCategoryOptions },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Filter to books imported from a specific source app (e.g. kindle, raindrop).",
    },
    ...updatedFilterParams(),
    {
      key: "last_highlight_at__gt",
      label: "Last highlighted after",
      type: "datetime",
      hint: "Some books have no value set for this.",
    },
    {
      key: "last_highlight_at__lt",
      label: "Last highlighted before",
      type: "datetime",
      hint: "Some books have no value set for this.",
    },
    ...pageParams(),
  ],
  output: [
    { key: "results", type: "array", label: "Books" },
    { key: "count", type: "number", label: "Total matching books" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json<ReadwisePage<unknown>>("/books/", {
      query: {
        category: input.category,
        source: input.source,
        updated__gt: input.updated__gt,
        updated__lt: input.updated__lt,
        last_highlight_at__gt: input.last_highlight_at__gt,
        last_highlight_at__lt: input.last_highlight_at__lt,
        page_size: input.page_size,
        page: input.page,
      },
    });
  },
};

export default bookList;
