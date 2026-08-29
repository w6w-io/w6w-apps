import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { bookIdParam, tagIdParam } from "../lib/params.ts";

/** `DELETE /api/v2/books/<id>/tags/<tag id>` — status `204`, no body. */
interface Input {
  bookId: string;
  tagId: string;
}

const bookTagDelete: ActionDefinition<Input> = {
  key: "book-tag-delete",
  type: "perform",
  resource: "book-tag",
  title: "Delete Book Tag",
  description: "Remove a tag from a book.",
  idempotent: true,
  params: [bookIdParam, tagIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new ReadwiseClient(ctx).status(
      `/books/${encodeURIComponent(input.bookId)}/tags/${encodeURIComponent(input.tagId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default bookTagDelete;
