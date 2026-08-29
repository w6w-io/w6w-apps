import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { bookIdParam, tagIdParam, tagNameParam } from "../lib/params.ts";

/** `PATCH /api/v2/books/<id>/tags/<tag id>` — rename a tag. */
interface Input {
  bookId: string;
  tagId: string;
  name: string;
}

const bookTagUpdate: ActionDefinition<Input> = {
  key: "book-tag-update",
  type: "perform",
  resource: "book-tag",
  title: "Update Book Tag",
  description: "Rename a tag on a book.",
  idempotent: true,
  params: [bookIdParam, tagIdParam, tagNameParam],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(
      `/books/${encodeURIComponent(input.bookId)}/tags/${encodeURIComponent(input.tagId)}`,
      { method: "PATCH", body: { name: input.name } },
    );
  },
};

export default bookTagUpdate;
