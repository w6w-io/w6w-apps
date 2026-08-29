import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { bookIdParam } from "../lib/params.ts";

/** `GET /api/v2/books/<id>/` — read one book/article/podcast by id. */
interface Input {
  bookId: string;
}

const bookGet: ActionDefinition<Input> = {
  key: "book-get",
  type: "read",
  resource: "book",
  title: "Get Book",
  description: "Read a specific book, article, tweet or podcast by id.",
  params: [bookIdParam],
  output: [
    { key: "id", type: "number", label: "Book ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "author", type: "string", label: "Author" },
    { key: "category", type: "string", label: "Category" },
    { key: "source", type: "string", label: "Source" },
    { key: "num_highlights", type: "number", label: "Highlight count" },
    { key: "highlights_url", type: "string", label: "Readwise URL" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(`/books/${encodeURIComponent(input.bookId)}/`);
  },
};

export default bookGet;
