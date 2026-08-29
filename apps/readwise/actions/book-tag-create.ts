import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient } from "../lib/client.ts";
import { bookIdParam, tagNameParam } from "../lib/params.ts";

/**
 * `POST /api/v2/books/<id>/tags/` — add a tag to a book.
 *
 * No de-duplication is documented, so this is left `idempotent: false` — the
 * same reasoning as `highlight-tag-create`.
 */
interface Input {
  bookId: string;
  name: string;
}

const bookTagCreate: ActionDefinition<Input> = {
  key: "book-tag-create",
  type: "perform",
  resource: "book-tag",
  title: "Create Book Tag",
  description: "Add a tag to a book.",
  idempotent: false,
  params: [bookIdParam, { ...tagNameParam, validation: { maxLength: 512 } }],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json(
      `/books/${encodeURIComponent(input.bookId)}/tags/`,
      { method: "POST", body: { name: input.name } },
    );
  },
};

export default bookTagCreate;
