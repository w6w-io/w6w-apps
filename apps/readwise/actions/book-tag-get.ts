import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { bookIdParam, tagIdParam } from "../lib/params.ts";

/** `GET /api/v2/books/<id>/tags/<tag id>` — one tag on one book. */
interface Input {
  bookId: string;
  tagId: string;
}

const bookTagGet: ActionDefinition<Input> = {
  key: "book-tag-get",
  type: "read",
  resource: "book-tag",
  title: "Get Book Tag",
  description: "Read one tag on a specific book.",
  params: [bookIdParam, tagIdParam],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(
      `/books/${encodeURIComponent(input.bookId)}/tags/${encodeURIComponent(input.tagId)}`,
    );
  },
};

export default bookTagGet;
