import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient, type ReadwisePage } from "../lib/client.ts";
import { bookIdParam, pageParams } from "../lib/params.ts";

/** `GET /api/v2/books/<id>/tags` — a book's tags, paginated. */
interface Input {
  bookId: string;
  page_size?: number;
  page?: number;
}

interface Tag {
  id: number;
  name: string;
}

const bookTagList: ActionDefinition<Input> = {
  key: "book-tag-list",
  type: "search",
  resource: "book-tag",
  title: "List Book Tags",
  description: "List the tags on a specific book.",
  params: [bookIdParam, ...pageParams()],
  output: [
    { key: "results", type: "array", label: "Tags" },
    { key: "count", type: "number", label: "Total tags" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json<ReadwisePage<Tag>>(
      `/books/${encodeURIComponent(input.bookId)}/tags`,
      { query: { page_size: input.page_size, page: input.page } },
    );
  },
};

export default bookTagList;
